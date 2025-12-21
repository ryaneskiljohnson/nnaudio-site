import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRole } from '@/utils/supabase/service';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServiceRole();

    // List all buckets
    const { data: buckets, error } = await supabase.storage.listBuckets();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      buckets: buckets || [],
    });
  } catch (error) {
    console.error('Error listing storage buckets:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

