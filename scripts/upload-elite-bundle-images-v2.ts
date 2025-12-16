import { createAdminClient } from '@/utils/supabase/service';
import { readFileSync } from 'fs';

async function uploadEliteBundleImages() {
  const supabase = await createAdminClient();

  const images = [
    { 
      file: '/Users/rjmacbookpro/Downloads/ULTIMATE_BUNDLE.png',
      bundleName: 'Ultimate Bundle'
    },
    { 
      file: '/Users/rjmacbookpro/Downloads/PRODUCERS_ARSENAL.png',
      bundleName: "Producer's Arsenal"
    },
    { 
      file: '/Users/rjmacbookpro/Downloads/BEAT_LAB.png',
      bundleName: 'Beat Lab'
    }
  ];

  // Try different bucket names
  const bucketNames = ['products', 'product-images', 'images', 'bundles'];
  
  for (const { file, bundleName } of images) {
    try {
      console.log(`\nUploading ${bundleName}...`);
      
      // Read the file
      const fileBuffer = readFileSync(file);
      const fileName = file.split('/').pop() || 'bundle.png';
      const filePath = `bundles/${fileName}`;

      let uploaded = false;
      let publicUrl = '';

      for (const bucketName of bucketNames) {
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(bucketName)
          .upload(filePath, fileBuffer, {
            contentType: 'image/png',
            upsert: true
          });

        if (!uploadError) {
          const { data: { publicUrl: url } } = supabase.storage
            .from(bucketName)
            .getPublicUrl(filePath);
          publicUrl = url;
          uploaded = true;
          console.log(`✓ Uploaded to bucket: ${bucketName}`);
          break;
        }
      }

      if (!uploaded) {
        console.error(`✗ Could not upload ${bundleName} to any bucket`);
        continue;
      }

      console.log(`✓ URL: ${publicUrl}`);

      // Update bundle with featured_image_url
      const { error: updateError } = await supabase
        .from('bundles')
        .update({ featured_image_url: publicUrl })
        .ilike('name', `%${bundleName}%`);

      if (updateError) {
        console.error(`Error updating ${bundleName}:`, updateError);
      } else {
        console.log(`✓ Updated ${bundleName} with featured_image_url`);
      }
    } catch (error) {
      console.error(`Error processing ${bundleName}:`, error);
    }
  }

  console.log('\n✓ Done!');
}

uploadEliteBundleImages().catch(console.error);
