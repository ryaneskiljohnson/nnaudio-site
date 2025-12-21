import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRole } from '@/utils/supabase/service';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const bucket = searchParams.get('bucket');
    const folder = searchParams.get('folder') || '';
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!bucket) {
      return NextResponse.json(
        { success: false, error: 'Bucket parameter is required' },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServiceRole();

    // List files from the bucket
    const { data: files, error } = await supabase.storage
      .from(bucket)
      .list(folder, {
        limit,
        offset,
        sortBy: { column: 'name', order: 'asc' },
      });

    if (error) {
      // If folder doesn't exist, return empty array
      if (error.message?.includes('not found') || error.message?.includes('No such file')) {
        return NextResponse.json({ success: true, files: [] });
      }
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // Get public URLs for each file
    // In Supabase storage, folders are identified by having null id
    // When listing a folder, items with null id are subfolders
    const filesWithUrls = await Promise.all(
      (files || []).map(async (file) => {
        // A folder in Supabase storage has null id
        // Files have a valid id
        const isFolder = file.id === null;
        
        const filePath = folder ? `${folder}/${file.name}` : file.name;
        
        let publicUrl = '';
        if (!isFolder) {
          const { data: urlData } = supabase.storage
            .from(bucket)
            .getPublicUrl(filePath);
          publicUrl = urlData.publicUrl;
        }

        return {
          name: file.name,
          path: filePath,
          publicUrl,
          size: file.metadata?.size || null,
          updatedAt: file.updated_at || null,
          isFolder,
        };
      })
    );

    return NextResponse.json({
      success: true,
      files: filesWithUrls,
    });
  } catch (error) {
    console.error('Error listing storage files:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

