import { NextRequest, NextResponse } from 'next/server';
import Stripe from "stripe";
import { createClient } from "@/utils/supabase/server";
import { stripe } from "@/utils/stripe/client";

/**
 * DELETE - Delete a Stripe coupon
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: adminCheck } = await supabase
      .from('admins')
      .select('*')
      .eq('user', user.id)
      .single();

    if (!adminCheck) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: couponId } = await params;

    if (!couponId) {
      return NextResponse.json({ error: 'Coupon ID required' }, { status: 400 });
    }

    // Delete the coupon from Stripe
    try {
      await stripe.coupons.del(couponId);
      
      return NextResponse.json({
        success: true,
        message: 'Coupon deleted successfully',
      });
    } catch (stripeError: any) {
      console.error('Stripe error deleting coupon:', stripeError);
      return NextResponse.json({
        success: false,
        error: stripeError.message || 'Failed to delete coupon from Stripe',
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in DELETE /api/stripe/coupons:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

