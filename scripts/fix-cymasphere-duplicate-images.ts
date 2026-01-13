/**
 * @fileoverview Script to fix duplicate feature images in Cymasphere product
 * @module scripts/fix-cymasphere-duplicate-images
 * 
 * This script removes redundant features that use duplicate images.
 * Based on analysis, the following features are redundant:
 * - "Interactive Chord Progression Timeline" (uses Song View.png - already covered by "Song Builder")
 * - "Real-Time Chord Reharmonization" (uses Palette View.png - already covered by "Harmony Palettes")
 * - "Custom Voicing Generation Engine" (uses Voicing View.png - already covered by "Advanced Voicing System")
 * - "Comprehensive Arrangement View" (uses Song View.png - already covered by "Song Builder")
 * - "Standalone App & DAW Plugin Support" (uses Settings Manager Window.png - already covered by "Settings Manager")
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { resolve } from "path";

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface Feature {
  title: string;
  description?: string;
  image_url?: string;
  gif_url?: string;
}

async function fixDuplicateImages() {
  console.log("🔧 Fixing duplicate feature images in Cymasphere...\n");

  // Fetch current Cymasphere product
  const { data: product, error: findError } = await supabase
    .from("products")
    .select("id, name, slug, features")
    .eq("slug", "cymasphere")
    .single();

  if (findError || !product) {
    console.error("❌ Error finding Cymasphere product:", findError);
    return;
  }

  console.log(`✅ Found product: ${product.name}\n`);

  const features: Feature[] = product.features || [];
  console.log(`📊 Current features: ${features.length}\n`);

  // Identify features to remove (redundant ones with duplicate images)
  const featuresToRemove = [
    "Interactive Chord Progression Timeline", // Uses Song View.png (duplicate)
    "Real-Time Chord Reharmonization", // Uses Palette View.png (duplicate)
    "Custom Voicing Generation Engine", // Uses Voicing View.png (duplicate)
    "Comprehensive Arrangement View", // Uses Song View.png (duplicate)
    "Standalone App & DAW Plugin Support", // Uses Settings Manager Window.png (duplicate)
  ];

  // Filter out redundant features
  const filteredFeatures = features.filter(
    (feature) => !featuresToRemove.includes(feature.title)
  );

  console.log(`🗑️  Removing ${features.length - filteredFeatures.length} redundant features:\n`);
  featuresToRemove.forEach((title) => {
    const feature = features.find((f) => f.title === title);
    if (feature) {
      console.log(`   - ${title} (${feature.image_url || feature.gif_url || "no image"})`);
    }
  });

  console.log(`\n✅ Keeping ${filteredFeatures.length} unique features\n`);

  // Update product with filtered features
  const { error: updateError } = await supabase
    .from("products")
    .update({
      features: filteredFeatures,
      updated_at: new Date().toISOString(),
    })
    .eq("id", product.id);

  if (updateError) {
    console.error("❌ Error updating product:", updateError);
    return;
  }

  console.log(`✅ Successfully updated Cymasphere!\n`);
  console.log(`📊 Final feature count: ${filteredFeatures.length}\n`);
  console.log("Remaining features:");
  filteredFeatures.forEach((feature, index) => {
    console.log(`  ${index + 1}. ${feature.title}`);
  });
}

// Check if --dry-run flag is set
const isDryRun = process.argv.includes("--dry-run");

if (isDryRun) {
  console.log("🔍 DRY RUN MODE - No changes will be made\n");
  // Just show what would be removed
  supabase
    .from("products")
    .select("id, name, slug, features")
    .eq("slug", "cymasphere")
    .single()
    .then(({ data: product }) => {
      if (product) {
        const features: Feature[] = product.features || [];
        const featuresToRemove = [
          "Interactive Chord Progression Timeline",
          "Real-Time Chord Reharmonization",
          "Custom Voicing Generation Engine",
          "Comprehensive Arrangement View",
          "Standalone App & DAW Plugin Support",
        ];
        const filteredFeatures = features.filter(
          (feature) => !featuresToRemove.includes(feature.title)
        );
        console.log(`Would remove ${features.length - filteredFeatures.length} features:`);
        featuresToRemove.forEach((title) => {
          const feature = features.find((f) => f.title === title);
          if (feature) {
            console.log(`  - ${title}`);
          }
        });
        console.log(`\nWould keep ${filteredFeatures.length} features`);
      }
    });
} else {
  fixDuplicateImages().catch((error) => {
    console.error("❌ Unexpected error:", error);
    process.exit(1);
  });
}
