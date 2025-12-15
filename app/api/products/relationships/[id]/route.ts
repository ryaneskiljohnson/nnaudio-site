import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/service';

// DELETE /api/products/relationships/[id] - Delete product relationship
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { id } = params;
    const adminSupabase = await createAdminClient();

    const { error } = await adminSupabase
      .from('product_relationships')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting relationship:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Relationship deleted successfully'
    });
  } catch (error: any) {
    console.error('Unexpected error in DELETE /api/products/relationships/[id]:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

