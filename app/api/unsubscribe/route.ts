import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRole } from '@/utils/supabase/service';
import { createClient } from '@/utils/supabase/server';
import { verifyUnsubscribeToken } from '@/utils/email-campaigns/unsubscribe-tokens';
import { checkRateLimit, getClientIp } from '@/utils/rateLimit';

export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);

    // Rate limiting check (10 requests per minute per IP)
    if (!checkRateLimit(`unsubscribe:${clientIp}`, 10, 60)) {
      console.warn(`[Unsubscribe API] Rate limit exceeded for IP: ${clientIp}`);
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const { email, action = 'unsubscribe', token } = await request.json();

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Get service role client
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[Unsubscribe API] SUPABASE_SERVICE_ROLE_KEY is not set in environment variables');
      console.error('[Unsubscribe API] Available env vars:', Object.keys(process.env).filter(k => k.includes('SUPABASE')).join(', '));
      return NextResponse.json(
        { success: false, error: 'Server configuration error: Missing SUPABASE_SERVICE_ROLE_KEY. Please restart your dev server.' },
        { status: 500 }
      );
    }

    let supabase;
    try {
      supabase = await createSupabaseServiceRole();
    } catch (error) {
      console.error('[Unsubscribe API] Error creating Supabase service role client:', error);
      const errorDetails = error instanceof Error ? error.message : String(error);
      console.error('[Unsubscribe API] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      return NextResponse.json(
        { success: false, error: 'Server configuration error', details: errorDetails },
        { status: 500 }
      );
    }

    if (action === 'unsubscribe') {
      // A valid, signed, email-matching token is REQUIRED to mutate. Missing,
      // invalid, or mismatched tokens return a generic success (no DB change)
      // so the endpoint cannot be used to unsubscribe arbitrary addresses or
      // to enumerate subscribers.
      const genericSuccess = {
        success: true,
        message: 'Successfully unsubscribed from emails',
        email: email.toLowerCase(),
        status: 'unsubscribed' as const,
      };

      const verifiedEmail = token ? verifyUnsubscribeToken(token) : null;
      if (!token || !verifiedEmail || verifiedEmail !== email.toLowerCase()) {
        console.warn(
          `[Unsubscribe API] Rejected tokenless/invalid unsubscribe for ${email} from IP ${clientIp}`
        );
        return NextResponse.json(genericSuccess);
      }

      // Handle unsubscribe (token verified)
      const { data: subscriber, error: fetchError } = await supabase
        .from('subscribers')
        .select('id, email, status, unsubscribe_date')
        .eq('email', email.toLowerCase())
        .single();

      // Prevent email enumeration - always return success, but only actually unsubscribe if subscriber exists
      const successResponse = {
        success: true,
        message: 'Successfully unsubscribed from emails',
        email: email.toLowerCase(),
        status: 'unsubscribed' as const
      };

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('[Unsubscribe API] Error fetching subscriber:', fetchError);
        // Return success to prevent enumeration, but log the error
        return NextResponse.json(successResponse);
      }

      if (!subscriber) {
        // Create a new unsubscribed subscriber record (id required by schema - use crypto.randomUUID)
        const { error: insertError } = await supabase
          .from('subscribers')
          .insert({
            id: crypto.randomUUID(),
            email: email.toLowerCase(),
            status: 'unsubscribed',
            unsubscribe_date: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (insertError) {
          console.error('[Unsubscribe API] Error creating unsubscribed subscriber:', insertError);
          // Still return success to prevent enumeration
        }

        return NextResponse.json(successResponse);
      }

      // Update existing subscriber
      const { error: updateError } = await supabase
        .from('subscribers')
        .update({
          status: 'unsubscribed',
          unsubscribe_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', subscriber.id);

      if (updateError) {
        console.error('[Unsubscribe API] Error updating subscriber:', updateError);
        // Still return success to prevent enumeration
      }

      return NextResponse.json(successResponse);

    } else if (action === 'resubscribe') {
      // Resubscribe is admin-only - verify admin authentication
      const supabaseClient = await createClient();
      const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
      
      if (authError || !user) {
        console.warn(`[Unsubscribe API] Unauthorized resubscribe attempt for: ${email} from IP: ${clientIp}`);
        return NextResponse.json(
          { success: false, error: 'Unauthorized. Admin access required.' },
          { status: 401 }
        );
      }
      
      // Check if user is admin
      const { data: adminCheck, error: adminError } = await supabaseClient
        .from('admins')
        .select('*')
        .eq('user', user.id)
        .maybeSingle();
      
      const isAdmin = adminError?.code !== 'PGRST116' && !!adminCheck;
      
      if (!isAdmin) {
        console.warn(`[Unsubscribe API] Non-admin resubscribe attempt for: ${email} by user: ${user.id} from IP: ${clientIp}`);
        return NextResponse.json(
          { success: false, error: 'Unauthorized. Admin access required.' },
          { status: 403 }
        );
      }

      console.log(`[Unsubscribe API] Admin resubscribe request for: ${email} by admin: ${user.id}`);
      
      const { data: subscriber, error: fetchError } = await supabase
        .from('subscribers')
        .select('id, email, status')
        .eq('email', email.toLowerCase())
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Failed to fetch subscriber' },
          { status: 500 }
        );
      }

      if (!subscriber) {
        return NextResponse.json(
          { success: false, error: 'Subscriber not found' },
          { status: 404 }
        );
      }

      // Update subscriber status to active
      const { error: updateError } = await supabase
        .from('subscribers')
        .update({
          status: 'active',
          unsubscribe_date: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', subscriber.id);

      if (updateError) {
        console.error('[Unsubscribe API] Error updating subscriber:', updateError);
        return NextResponse.json(
          { success: false, error: 'Failed to resubscribe', details: updateError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Successfully resubscribed to emails',
        email: email.toLowerCase(),
        status: 'active'
      });

    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid action' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('[Unsubscribe API] Unhandled error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('[Unsubscribe API] Error details:', { errorMessage, errorStack });
    
    // Return more detailed error in development
    const isDevelopment = process.env.NODE_ENV === 'development';
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error', 
        details: isDevelopment ? errorMessage : undefined,
        ...(isDevelopment && errorStack ? { stack: errorStack } : {})
      },
      { status: 500 }
    );
  }
}
