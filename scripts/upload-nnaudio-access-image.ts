/**
 * @fileoverview Upload NNAudio_Access.png to Supabase product-images and set as NNAudio Access product main image.
 * @module scripts/upload-nnaudio-access-image
 */

import { createAdminClient } from "@/utils/supabase/service";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { resolve } from "path";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const IMAGE_PATH = "/Users/rjmacbookpro/Downloads/NNAudio_Access.png";
const STORAGE_FILE_NAME = "nnaudio-access.png";

/**
 * @brief Upload local image to Supabase Storage and set as NNAudio Access featured image.
 */
async function uploadAndUpdate() {
  console.log("=== Upload NNAudio Access main image ===\n");

  if (!fs.existsSync(IMAGE_PATH)) {
    console.error(`Image not found: ${IMAGE_PATH}`);
    process.exit(1);
  }

  const adminSupabase = await createAdminClient();

  const { data: product, error: productError } = await adminSupabase
    .from("products")
    .select("id, name, slug, featured_image_url")
    .eq("slug", "nnaudio-access")
    .single();

  if (productError || !product) {
    console.error("Error fetching NNAudio Access product:", productError);
    process.exit(1);
  }

  console.log(`Product: ${product.name} (${product.id})\n`);

  process.stdout.write("Uploading to Supabase Storage (product-images)... ");
  const fileBuffer = fs.readFileSync(IMAGE_PATH);

  const { error: uploadError } = await adminSupabase.storage
    .from("product-images")
    .upload(STORAGE_FILE_NAME, fileBuffer, {
      contentType: "image/png",
      upsert: true,
      cacheControl: "3600",
    });

  if (uploadError) {
    console.log("FAILED");
    console.error("Upload error:", uploadError.message);
    process.exit(1);
  }

  const { data: urlData } = adminSupabase.storage
    .from("product-images")
    .getPublicUrl(STORAGE_FILE_NAME);

  const publicUrl = urlData.publicUrl;
  console.log("OK");
  console.log(`  URL: ${publicUrl}\n`);

  process.stdout.write("Updating product featured_image_url and featured_image_url_png... ");
  const { error: updateError } = await adminSupabase
    .from("products")
    .update({
      featured_image_url: publicUrl,
      featured_image_url_png: publicUrl,
    })
    .eq("id", product.id);

  if (updateError) {
    console.log("FAILED");
    console.error("Update error:", updateError.message);
    process.exit(1);
  }

  console.log("OK");
  console.log("\nDone. NNAudio Access main image is set to:", publicUrl);
}

uploadAndUpdate().catch((err) => {
  console.error(err);
  process.exit(1);
});
