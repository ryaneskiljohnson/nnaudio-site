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

async function checkAllSampleLocations() {
  console.log("🔍 Checking All Sample Library Locations\n");
  console.log("=".repeat(70));

  // Check products/sample-libraries/
  const { data: sampleLibFiles, error: sampleLibError } = await supabase.storage
    .from("product-downloads")
    .list("products/sample-libraries", {
      limit: 1000,
    });

  console.log(`\n📦 Files in products/sample-libraries/: ${sampleLibFiles?.length || 0}`);

  // Check individual product folders
  const { data: productFolders, error: foldersError } = await supabase.storage
    .from("product-downloads")
    .list("products", {
      limit: 1000,
    });

  if (foldersError) {
    console.error("❌ Error listing product folders:", foldersError);
    return;
  }

  const sampleFilesInFolders: Array<{ folder: string; file: string; size: number }> = [];

  if (productFolders) {
    for (const folder of productFolders) {
      if (folder.name === "sample-libraries") continue;
      
      const { data: folderFiles, error: folderFilesError } = await supabase.storage
        .from("product-downloads")
        .list(`products/${folder.name}`, {
          limit: 100,
        });

      if (!folderFilesError && folderFiles) {
        for (const file of folderFiles) {
          if (file.name === "samples.zip" || file.name.startsWith("samples") || file.name.endsWith(".ch1")) {
            sampleFilesInFolders.push({
              folder: folder.name,
              file: file.name,
              size: file.metadata?.size || 0,
            });
          }
        }
      }
    }
  }

  console.log(`\n📁 Sample files in individual product folders: ${sampleFilesInFolders.length}`);
  
  if (sampleFilesInFolders.length > 0) {
    console.log("\nFound sample files in product folders:");
    sampleFilesInFolders.forEach(({ folder, file, size }) => {
      const sizeMB = (size / 1024 / 1024).toFixed(2);
      console.log(`   - products/${folder}/${file} (${sizeMB} MB)`);
    });
  }

  // Now verify all products have their samples associated
  console.log("\n" + "=".repeat(70));
  console.log("🔍 Verifying Product Associations\n");

  const { data: allProducts, error: productsError } = await supabase
    .from("products")
    .select("id, name, slug, downloads")
    .eq("status", "active");

  if (productsError) {
    console.error("❌ Error fetching products:", productsError);
    return;
  }

  // Expected products that should have samples (based on files in sample-libraries)
  const expectedProductsWithSamples = [
    'albanju',
    'apache-flute',
    'bakers-dozen',
    'blaque',
    'curio-texture-generator',
    'digitaldreamscape-quad-rompler',
    'evanescent-baby-grand-piano',
    'game-boi-retro-sounds-free-plugin',
    'go-to-work-modern-song-constructions',
    'cowboy-harp-free-jaw-harp-plugin',
    'mandolele-mandolin-ukulele',
    'mesosphere',
    'natura',
    'noker',
    'numb',
    'obscura-tortured-orchestral-box',
    'perc-gadget',
    'prodigious',
    'quoir',
    'reiya',
    'rompl-workstation',
    'strange-tingz-free-80s-plugin',
    'subflux-bass-module',
    'tactures',
    'tetrad-series', // Special case - has 3 sample files
  ];

  let allAssociated = true;
  const missingProducts: string[] = [];

  for (const slug of expectedProductsWithSamples) {
    const product = allProducts?.find(p => p.slug === slug);
    
    if (!product) {
      console.error(`❌ Product not found: ${slug}`);
      missingProducts.push(slug);
      allAssociated = false;
      continue;
    }

    const downloads = (product.downloads as any[]) || [];
    const hasSamples = downloads.some((d: any) => d.type === "samples");

    if (!hasSamples) {
      console.error(`❌ Missing samples: ${product.name} (${slug})`);
      missingProducts.push(slug);
      allAssociated = false;
    } else {
      const sampleCount = downloads.filter((d: any) => d.type === "samples").length;
      console.log(`✅ ${product.name} (${slug}) - ${sampleCount} sample download(s)`);
    }
  }

  console.log("\n" + "=".repeat(70));
  if (allAssociated) {
    console.log("✅ ALL SAMPLE LIBRARIES ARE CORRECTLY ASSOCIATED!");
    console.log(`   - ${expectedProductsWithSamples.length} products verified`);
    console.log(`   - ${sampleLibFiles?.length || 0} files in products/sample-libraries/`);
    if (sampleFilesInFolders.length > 0) {
      console.log(`   - ${sampleFilesInFolders.length} additional files in product folders`);
    }
  } else {
    console.log("❌ SOME ASSOCIATIONS ARE MISSING:");
    missingProducts.forEach(slug => console.log(`   - ${slug}`));
  }
}

checkAllSampleLocations().catch((error) => {
  console.error("❌ Script error:", error);
  process.exit(1);
});

