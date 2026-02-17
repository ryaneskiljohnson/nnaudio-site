import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { isPSTDateAfterNow, isPSTDateBeforeNow } from '@/utils/timezoneUtils';

/**
 * GET - Fetch active promotions
 * Query params:
 *   - plan: 'monthly' | 'annual' | 'lifetime' (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const plan = searchParams.get('plan');

    const supabase = await createClient();

    let query = (supabase as any)
      .from('promotions')
      .select('*')
      .eq('active', true)
      .order('priority', { ascending: false });

    // Filter by date range (current time must be within range or no range set)
    const now = new Date().toISOString();
    
    const { data: promotions, error } = await query;

    if (error) {
      console.error('Error fetching active promotions:', error);
      return NextResponse.json({ error: 'Failed to fetch promotions' }, { status: 500 });
    }

    // Filter by date and plan in JavaScript (more complex filtering)
    // All date comparisons are done in PST timezone
    const filtered = promotions?.filter((promo: any) => {
      // Check date range in PST
      if (promo.start_date && isPSTDateAfterNow(promo.start_date)) {
        return false; // Not started yet (in PST)
      }
      if (promo.end_date && isPSTDateBeforeNow(promo.end_date)) {
        return false; // Already ended (in PST)
      }

      // Check plan if specified
      if (plan && !promo.applicable_plans?.includes(plan)) {
        return false;
      }

      return true;
    }) || [];

    // Return highest priority promotion
    const activePromotion = filtered.length > 0 ? filtered[0] : null;

    return NextResponse.json(
      {
        success: true,
        promotion: activePromotion,
        count: filtered.length,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30",
        },
      }
    );
  } catch (error) {
    console.error('Error in GET /api/promotions/active:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

