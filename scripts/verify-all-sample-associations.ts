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

// Complete mapping from filename patterns to product slugs
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

async function listAllSampleFiles() {
  const { data: sampleLibFiles, error: sampleLibError } = await supabase.storage
    .from("product-downloads")
    .list("products/sample-libraries", {
      limit: 1000,
      sortBy: { column: "name", order: "asc" },
    });

  if (sampleLibError) {
    console.error("❌ Error listing sample-libraries:", sampleLibError);
    return [];
  }

  return sampleLibFiles || [];
}

async function verifyAssociations() {
  console.log("🔍 Verifying All Sample Library Associations\n");
  console.log("=".repeat(70));

  // Get all sample files from storage
  const files = await listAllSampleFiles();
  const zipFiles = files.filter(f => f.name.endsWith('.zip'));

  console.log(`\n📦 Found ${zipFiles.length} sample library files in storage\n`);

  // Get all products
  const { data: allProducts, error: productsError } = await supabase
    .from("products")
    .select("id, name, slug, downloads")
    .eq("status", "active");

  if (productsError) {
    console.error("❌ Error fetching products:", productsError);
    return;
  }

  const productMap = new Map((allProducts || []).map(p => [p.slug, p]));

  let successCount = 0;
  let missingCount = 0;
  let incorrectCount = 0;
  const missingAssociations: Array<{ file: string; expectedSlug: string; productName?: string }> = [];
  const incorrectAssociations: Array<{ file: string; expectedSlug: string; actualSlug?: string }> = [];

  // Verify each file
  for (const file of zipFiles) {
    const filenameKey = file.name.replace('.zip', '');
    const expectedSlug = FILENAME_TO_SLUG_MAPPING[filenameKey];
    
    if (!expectedSlug) {
      console.warn(`⚠️  No mapping found for: ${file.name}`);
      continue;
    }

    // Special handling for Tetrad - all three files should be associated with tetrad-series
    const actualSlug = expectedSlug.startsWith('tetrad-') ? 'tetrad-series' : expectedSlug;
    
    const product = productMap.get(actualSlug);
    
    if (!product) {
      console.error(`❌ Product not found: ${actualSlug} (for ${file.name})`);
      missingAssociations.push({ file: file.name, expectedSlug: actualSlug });
      missingCount++;
      continue;
    }

    const downloads = (product.downloads as any[]) || [];
    const sampleDownloads = downloads.filter((d: any) => 
      d.type === "samples" && 
      d.path === `products/sample-libraries/${file.name}`
    );

    if (sampleDownloads.length === 0) {
      console.error(`❌ Missing association: ${file.name} → ${product.name} (${actualSlug})`);
      missingAssociations.push({ 
        file: file.name, 
        expectedSlug: actualSlug, 
        productName: product.name 
      });
      missingCount++;
    } else {
      // Verify the association is correct
      const correctAssociation = sampleDownloads.some((d: any) => 
        d.path === `products/sample-libraries/${file.name}` &&
        d.type === "samples"
      );
      
      if (correctAssociation) {
        console.log(`✅ ${file.name} → ${product.name}`);
        successCount++;
      } else {
        console.error(`❌ Incorrect association: ${file.name}`);
        incorrectAssociations.push({ file: file.name, expectedSlug: actualSlug });
        incorrectCount++;
      }
    }
  }

  // Summary
  console.log("\n" + "=".repeat(70));
  console.log("📊 Verification Summary:");
  console.log(`   ✅ Correctly associated: ${successCount}`);
  console.log(`   ❌ Missing associations: ${missingCount}`);
  console.log(`   ⚠️  Incorrect associations: ${incorrectCount}`);
  console.log(`   📦 Total files checked: ${zipFiles.length}`);

  if (missingAssociations.length > 0) {
    console.log("\n❌ Missing Associations:");
    missingAssociations.forEach(m => {
      console.log(`   - ${m.file} → ${m.productName || m.expectedSlug}`);
    });
  }

  if (incorrectAssociations.length > 0) {
    console.log("\n⚠️  Incorrect Associations:");
    incorrectAssociations.forEach(i => {
      console.log(`   - ${i.file} → ${i.expectedSlug}`);
    });
  }

  return {
    successCount,
    missingCount,
    incorrectCount,
    missingAssociations,
    incorrectAssociations,
  };
}

async function fixMissingAssociations(missingAssociations: Array<{ file: string; expectedSlug: string; productName?: string }>) {
  if (missingAssociations.length === 0) {
    return;
  }

  console.log("\n🔧 Fixing missing associations...\n");

  for (const missing of missingAssociations) {
    const file = missing.file;
    const productSlug = missing.expectedSlug;
    
    // Get file info from storage
    const { data: fileData } = await supabase.storage
      .from("product-downloads")
      .list("products/sample-libraries", {
        limit: 1000,
      });

    const fileInfo = fileData?.find(f => f.name === file);
    if (!fileInfo) {
      console.error(`❌ File not found in storage: ${file}`);
      continue;
    }

    // Get product
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, name, slug, downloads")
      .eq("slug", productSlug)
      .eq("status", "active")
      .single();

    if (productError || !product) {
      console.error(`❌ Product not found: ${productSlug}`);
      continue;
    }

    // Prepare download object
    const filePath = `products/sample-libraries/${file}`;
    const fileSize = fileInfo.metadata?.size || 0;
    
    let sampleName: string;
    if (productSlug === 'tetrad-series') {
      const componentMatch = file.match(/Tetrad-(\w+)-/i);
      if (componentMatch) {
        sampleName = `Tetrad ${componentMatch[1]} Samples`;
      } else {
        sampleName = `${product.name} Samples`;
      }
    } else {
      sampleName = `${product.name} Samples`;
    }

    const downloadObject = {
      path: filePath,
      name: sampleName,
      type: "samples",
      version: null,
      file_size: fileSize,
    };

    // Update downloads array
    const currentDownloads = (product.downloads as any[]) || [];
    const filteredDownloads = currentDownloads.filter(
      (d: any) => !(d.type === "samples" && d.path === filePath)
    );
    const updatedDownloads = [...filteredDownloads, downloadObject];

    console.log(`💾 Fixing ${product.name} (${productSlug})...`);
    const { error: updateError } = await supabase
      .from("products")
      .update({ downloads: updatedDownloads })
      .eq("id", product.id);

    if (updateError) {
      console.error(`❌ Error updating ${product.name}:`, updateError);
    } else {
      console.log(`✅ Successfully associated ${file} with ${product.name}\n`);
    }
  }
}

async function main() {
  const result = await verifyAssociations();
  
  if (result && result.missingCount > 0) {
    console.log("\n" + "=".repeat(70));
    await fixMissingAssociations(result.missingAssociations);
    
    // Verify again after fixes
    console.log("\n" + "=".repeat(70));
    console.log("🔍 Re-verifying after fixes...\n");
    await verifyAssociations();
  }

  console.log("\n✅ Complete!");
}

main().catch((error) => {
  console.error("❌ Script error:", error);
  process.exit(1);
});

