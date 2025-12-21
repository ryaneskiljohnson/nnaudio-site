import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Mapping from filename patterns to product slugs
// Based on actual filenames in products/sample-libraries/
const FILENAME_TO_SLUG_MAPPING: Record<string, string> = {
  'samples_Albanju-Middle-Eastern-Banjo': 'albanju',
  'samples_Apache-Native-American-Flute': 'apache-flute',
  'samples_Bakers-Dozen-Bundle': 'bakers-dozen',
  'samples_Blaque-Dark-Electric-Guitar': 'blaque',
  'samples_Curio-Sample-Archive': 'curio-texture-generator',
  'samples_DigitalDreamsacpe-Sample-Archive': 'digitaldreamscape-quad-rompler',
  'samples_Evanescent-Baby-Grand-Pianio': 'evanescent-baby-grand-piano',
  'samples_Game-Boi-Sample-Archive': 'game-boi-retro-sounds-free-plugin',
  'samples_Go-To-Work-Modern-Song-Constructions': 'go-to-work-modern-song-constructions',
  'samples_Jay-Harp-Sample-Archive': 'cowboy-harp-free-jaw-harp-plugin',
  'samples_Mandolele-Mandolin-and-Ukulele': 'mandolele-mandolin-ukulele',
  'samples_Mesosphere-Samples-Archive': 'mesosphere',
  'samples_Natura-Sampled-Analog-Instrument': 'natura',
  'samples_Noker-Drum-and-Bass': 'noker',
  'samples_Numb-Dark-Acoustic-Guitar': 'numb',
  'samples_Obscura-Sample-Archive': 'obscura-tortured-orchestral-box',
  'samples_Perc-Gadget-Sample-Archive': 'perc-gadget',
  'samples_Prodigious-Samples-Archive': 'prodigious',
  'samples_Quoir-Mixed-Vocal-Choir': 'quoir',
  'samples_Reiya-Sample-Archive': 'reiya',
  'samples_Rompl-Workstation-Sample-Archive': 'rompl-workstation',
  'samples_Strange-Tingz-Samples-Archive': 'strange-tingz-free-80s-plugin',
  'samples_Subflux-Sample-Archive': 'subflux-bass-module',
  'samples_Tactures-Sample-Archive': 'tactures',
  'samples_Tetrad-Guitars-Sample-Archive': 'tetrad-series',
  'samples_Tetrad-Keys-Samples-Archive': 'tetrad-series',
  'samples_Tetrad-Winds-Sample-Archive': 'tetrad-series',
};

// Also handle files that might be in products/{slug}/ format
async function listAllSampleFiles() {
  console.log("🔍 Listing all sample library files in Supabase Storage...\n");

  // Check products/sample-libraries/ directory (where files were uploaded via S3)
  const { data: sampleLibFiles, error: sampleLibError } = await supabase.storage
    .from("product-downloads")
    .list("products/sample-libraries", {
      limit: 1000,
      sortBy: { column: "name", order: "asc" },
    });

  if (sampleLibError) {
    console.error("❌ Error listing sample-libraries:", sampleLibError);
  }

  // Also check individual product folders
  const { data: productFolders, error: foldersError } = await supabase.storage
    .from("product-downloads")
    .list("products", {
      limit: 1000,
      sortBy: { column: "name", order: "asc" },
    });

  if (foldersError) {
    console.error("❌ Error listing product folders:", foldersError);
  }

  const allFiles: Array<{ path: string; name: string; size: number; slug?: string }> = [];

  // Process files from products/sample-libraries/
  if (sampleLibFiles && sampleLibFiles.length > 0) {
    console.log(`📦 Found ${sampleLibFiles.length} files in products/sample-libraries/\n`);
    
    for (const file of sampleLibFiles) {
      if (!file.name.endsWith('.zip')) continue;
      
      // Extract slug from filename: samples_{slug}.zip
      const slugMatch = file.name.match(/^samples_(.+)\.zip$/i);
      if (slugMatch) {
        const filenameKey = file.name.replace('.zip', '');
        // Try exact match first
        let productSlug = FILENAME_TO_SLUG_MAPPING[filenameKey];
        
        // If no exact match, try case-insensitive match
        if (!productSlug) {
          const lowerKey = filenameKey.toLowerCase();
          for (const [key, slug] of Object.entries(FILENAME_TO_SLUG_MAPPING)) {
            if (key.toLowerCase() === lowerKey) {
              productSlug = slug;
              break;
            }
          }
        }
        
        // If still no match, try to derive from filename
        if (!productSlug) {
          // Convert "Albanju-Middle-Eastern-Banjo" to "albanju-middle-eastern-banjo"
          const derivedSlug = slugMatch[1].toLowerCase().replace(/\s+/g, '-');
          productSlug = derivedSlug;
        }
        
        allFiles.push({
          path: `products/sample-libraries/${file.name}`,
          name: file.name,
          size: file.metadata?.size || 0,
          slug: productSlug,
        });
      }
    }
  }

  // Process files from individual product folders (products/{slug}/samples.zip)
  // Only if we didn't find files in products/sample-libraries/
  if ((!sampleLibFiles || sampleLibFiles.length === 0) && productFolders && productFolders.length > 0) {
    for (const folder of productFolders) {
      if (folder.name === "sample-libraries") continue; // Skip the sample-libraries folder
      
      const { data: folderFiles, error: folderFilesError } = await supabase.storage
        .from("product-downloads")
        .list(`products/${folder.name}`, {
          limit: 100,
        });

      if (!folderFilesError && folderFiles) {
        for (const file of folderFiles) {
          if (file.name === "samples.zip" || file.name.startsWith("samples")) {
            allFiles.push({
              path: `products/${folder.name}/${file.name}`,
              name: file.name,
              size: file.metadata?.size || 0,
              slug: folder.name,
            });
          }
        }
      }
    }
  }

  return allFiles;
}

async function associateSampleWithProduct(
  filePath: string,
  fileName: string,
  fileSize: number,
  productSlug: string
) {
  try {
    // Special handling for Tetrad components - they all belong to tetrad-series
    let actualSlug = productSlug;
    let sampleName: string | null = null;
    
    if (productSlug.startsWith('tetrad-')) {
      actualSlug = 'tetrad-series';
      // Extract component name from filename: "Tetrad-Guitars-Sample-Archive" -> "Guitars"
      const componentMatch = fileName.match(/Tetrad-(\w+)-/i);
      if (componentMatch) {
        sampleName = `Tetrad ${componentMatch[1]} Samples`;
      }
    }
    
    // If no special name, use product name + "Samples"
    if (!sampleName) {
      // We'll set it after fetching the product
    }
    
    // Find product by slug
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, name, slug, downloads")
      .eq("slug", actualSlug)
      .eq("status", "active")
      .single();

    if (productError || !product) {
      console.error(`❌ Product not found: ${actualSlug} (from ${productSlug})`);
      return false;
    }

    // Prepare download object
    const finalSampleName = sampleName || `${product.name} Samples`;
    const downloadObject = {
      path: filePath,
      name: finalSampleName,
      type: "samples",
      version: null,
      file_size: fileSize,
    };

    // Update downloads array
    const currentDownloads = (product.downloads as any[]) || [];
    
    // For Tetrad, we want to keep all component samples, so only remove if it's the exact same path
    // For other products, remove all existing samples downloads from products/sample-libraries/
    // (but keep any from products/{slug}/samples.zip if they exist)
    let filteredDownloads: any[];
    if (actualSlug === 'tetrad-series') {
      // For Tetrad, only remove if it's the same file path
      filteredDownloads = currentDownloads.filter(
        (d: any) => !(d.type === "samples" && d.path === filePath)
      );
    } else {
      // For other products, remove all samples downloads from products/sample-libraries/
      // This ensures we don't have duplicates, but keeps any existing samples.zip in product folders
      filteredDownloads = currentDownloads.filter(
        (d: any) => !(d.type === "samples" && d.path?.startsWith("products/sample-libraries/"))
      );
    }
    
    // Add new download
    const updatedDownloads = [...filteredDownloads, downloadObject];

    console.log(`💾 Updating ${product.name} (${actualSlug})...`);
    console.log(`   File: ${filePath}`);
    console.log(`   Name: ${downloadObject.name}`);
    console.log(`   Size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);
    
    const { error: updateError } = await supabase
      .from("products")
      .update({ downloads: updatedDownloads })
      .eq("id", product.id);

    if (updateError) {
      console.error(`❌ Error updating ${product.name}:`, updateError);
      return false;
    }

    console.log(`✅ Successfully associated samples with ${product.name}\n`);
    return true;
  } catch (error: any) {
    console.error(`❌ Error associating ${productSlug}:`, error.message);
    return false;
  }
}

async function main() {
  console.log("🎯 Associating All Sample Libraries with Products\n");
  console.log("=".repeat(60));

  const files = await listAllSampleFiles();

  if (files.length === 0) {
    console.log("❌ No sample library files found in storage");
    return;
  }

  console.log(`\n📦 Found ${files.length} sample library files to associate\n`);

  let successCount = 0;
  let failCount = 0;

  for (const file of files) {
    if (!file.slug) {
      console.warn(`⚠️  Skipping ${file.name} - could not determine product slug`);
      failCount++;
      continue;
    }

    const success = await associateSampleWithProduct(
      file.path,
      file.name,
      file.size,
      file.slug
    );

    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("📊 Summary:");
  console.log(`   ✅ Successfully associated: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log(`   📦 Total files: ${files.length}`);
}

main().catch((error) => {
  console.error("❌ Script error:", error);
  process.exit(1);
});

