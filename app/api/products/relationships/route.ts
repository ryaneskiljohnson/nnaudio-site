import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/service';

// POST /api/products/relationships - Create product relationship
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check if user is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify admin status
    const { data: adminData, error: adminError } = await supabase
      .from('admins')
      .select('*')
      .eq('user', user.id)
      .single();

    if (adminError || !adminData) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const adminSupabase = createAdminClient();

    const { data: relationship, error } = await adminSupabase
      .from('product_relationships')
      .insert([{
        product_id: body.product_id,
        related_product_id: body.related_product_id,
        relationship_type: body.relationship_type || 'related',
        display_order: body.display_order || 0,
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating relationship:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      relationship
    });
  } catch (error: any) {
    console.error('Unexpected error in POST /api/products/relationships:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

