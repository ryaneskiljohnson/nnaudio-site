/**
 * @fileoverview Upload initial NNAudio Access manifest to this project's Supabase storage.
 * @module scripts/seed-nnaudio-access-manifest
 *
 * Run once to create builds/nnaudio-access/manifest.json so the dashboard
 * Downloads page and the NNAudio Access app updater can read version info.
 * After running a full release from NNAudioAccess/release.sh, the manifest
 * will be kept in sync automatically.
 *
 * Usage: npx tsx scripts/seed-nnaudio-access-manifest.ts
 * Requires: .env.local with NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const manifest = {
  app_version: "1.0.0",
  description: "",
  windows_installer: "NNAudioAccess_Installer.exe",
  mac_installer: "NNAudioAccess_Installer.pkg",
};

async function main() {
  const { error } = await supabase.storage
    .from("builds")
    .upload("nnaudio-access/manifest.json", JSON.stringify(manifest, null, 2), {
      contentType: "application/json",
      upsert: true,
    });

  if (error) {
    console.error("Upload failed:", error.message);
    if (error.message?.includes("Bucket not found")) {
      console.error("Create a public bucket named 'builds' in Supabase Dashboard → Storage.");
    }
    process.exit(1);
  }

  console.log("Uploaded builds/nnaudio-access/manifest.json");
}

main();
