/**
 * @fileoverview Create the "Plugin Play" product (slug: plugin-play) end-to-end.
 *   - Uploads composited marketing images to Supabase Storage (bucket: product-images, prefix: plugin-play/).
 *   - Inserts a draft `products` row shaped like the Cymasphere row, minus plugin-format dimensions.
 *   - Mirrors the admin POST /api/products handler by calling syncProductToStripe so a Stripe Product + $9.99 Price
 *     is created and the resulting Stripe IDs are persisted on the row.
 * @module scripts/create-plugin-play-product
 * @example
 *   bun scripts/create-plugin-play-product.ts
 */

import { createAdminClient } from "@/utils/supabase/service";
import { syncProductToStripe } from "@/utils/stripe/product-sync";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { resolve } from "path";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const SHOTS_DIR = "/tmp/pluginplay-shots/final";
const BUCKET = "product-images";
const PREFIX = "plugin-play";

/**
 * @brief Local file -> remote storage path mapping.
 */
const UPLOADS: Array<{ local: string; remote: string; contentType: string }> = [
  { local: "featured.webp", remote: "plugin-play.webp", contentType: "image/webp" },
  { local: "featured.png", remote: "plugin-play.png", contentType: "image/png" },
  { local: "gallery-01-loaded.png", remote: "gallery-01-loaded.png", contentType: "image/png" },
  { local: "gallery-02-vst3-host.png", remote: "gallery-02-vst3-host.png", contentType: "image/png" },
  { local: "gallery-03-cymasynth.png", remote: "gallery-03-cymasynth.png", contentType: "image/png" },
  { local: "gallery-04-open-ui.png", remote: "gallery-04-open-ui.png", contentType: "image/png" },
];

/**
 * @brief Detailed Markdown body for the product description.
 */
const DESCRIPTION = `Plugin Play is the fastest way to load, validate, and live-host an audio plugin on macOS. Drag in any \`.component\`, \`.vst3\`, \`.vst\`, or \`.appex\` bundle and Plugin Play will invalidate the AU cache, run the format-appropriate validator, instantiate the plugin, and pop open its UI with audio routed straight to your speakers.

Built for plugin developers tired of restarting Logic every time they change a line of DSP.

## Why developers use Plugin Play
- **Stop restarting your DAW.** Plugin Play kills \`AudioComponentRegistrar\` and refreshes the AU/VST3 cache for the *one* plugin you're working on.
- **Real load testing.** AU plugins are instantiated through \`AVAudioEngine\` and rendered offline for one second — the same code path Logic, GarageBand, and AUM use. VST3 plugins are loaded through a bundled JUCE PluginHost.
- **Live host with full UI.** The "Open UI" button hosts the plugin with realtime audio out and a built-in mini-keyboard, no DAW required.
- **Built-in validators.** One click to run \`auval\` (AU) or Tracktion's \`pluginval\` (VST3 / VST).
- **Hard Reset for stuck caches.** Wipe the entire AU registry and restart \`coreaudiod\` when normal refresh isn't enough.
- **DAW launchpad.** Detects Logic Pro, GarageBand, MainStage, Ableton Live, REAPER, Bitwig, and Studio One. Quit, relaunch, or invalidate Ableton's plugin DB without leaving the window.

## What you get
- Plugin Play.app (Apple Silicon native, macOS 14+)
- Bundled Tracktion \`pluginval\`
- Bundled JUCE \`PluginHost\` for VST3 hosting
- Drag-and-drop, recents list, and an output log you can copy with one click`;

/**
 * @brief Upload a single file to Supabase Storage at a versioned path.
 * @returns Public URL of the uploaded asset.
 */
async function uploadOne(
  admin: Awaited<ReturnType<typeof createAdminClient>>,
  localFile: string,
  remoteFile: string,
  contentType: string
): Promise<string> {
  const localPath = path.join(SHOTS_DIR, localFile);
  if (!fs.existsSync(localPath)) {
    throw new Error(`Local file missing: ${localPath}`);
  }
  const buf = fs.readFileSync(localPath);
  const remoteKey = `${PREFIX}/${remoteFile}`;
  process.stdout.write(`  upload ${remoteKey} (${(buf.length / 1024).toFixed(1)} KB) ... `);
  const { error } = await admin.storage.from(BUCKET).upload(remoteKey, buf, {
    contentType,
    upsert: true,
    cacheControl: "3600",
  });
  if (error) {
    console.log("FAILED");
    throw error;
  }
  const { data } = admin.storage.from(BUCKET).getPublicUrl(remoteKey);
  console.log(`OK`);
  return data.publicUrl;
}

async function main() {
  console.log("=== Plugin Play product bootstrap ===\n");

  const admin = await createAdminClient();

  // ---- 0. Bail if a row already exists ---------------------------------
  const { data: existing } = await admin
    .from("products")
    .select("id, slug")
    .eq("slug", "plugin-play")
    .maybeSingle();

  if (existing) {
    console.error(`A product with slug 'plugin-play' already exists (id=${existing.id}).`);
    console.error("Refusing to clobber. Delete or rename it first if you want to recreate.");
    process.exit(1);
  }

  // ---- 1. Upload images ------------------------------------------------
  console.log("==> Uploading images to Supabase Storage");
  const uploadedUrls: Record<string, string> = {};
  for (const u of UPLOADS) {
    const url = await uploadOne(admin, u.local, u.remote, u.contentType);
    uploadedUrls[u.local] = url;
  }
  console.log();

  const featuredWebp = uploadedUrls["featured.webp"];
  const featuredPng = uploadedUrls["featured.png"];
  const gallery = [
    uploadedUrls["gallery-01-loaded.png"],
    uploadedUrls["gallery-02-vst3-host.png"],
    uploadedUrls["gallery-03-cymasynth.png"],
    uploadedUrls["gallery-04-open-ui.png"],
  ];

  // ---- 2. Build features (mirroring Cymasphere shape) ------------------
  const features = [
    {
      title: "Refresh & Run",
      description:
        "Touches the bundle, kills AudioComponentRegistrar, runs auval or pluginval, then instantiates the plugin to verify it really loads.",
      image_url: gallery[1],
    },
    {
      title: "Live AU hosting with built-in keyboard",
      description:
        "Plays the plugin through AVAudioEngine with the native Cocoa AU editor view and a 2-octave mini keyboard for sending MIDI.",
      image_url: gallery[3],
    },
    {
      title: "VST3 hosting via JUCE PluginHost",
      description:
        "Bundled JUCE host displays the VST3 editor and runs headless audio tests so VST3 plugins behave like first-class citizens.",
      image_url: gallery[1],
    },
    {
      title: "Hard Reset for stuck caches",
      description:
        "Wipes the full AU cache and restarts coreaudiod (with admin elevation) for the cases where a normal refresh isn't enough.",
      image_url: gallery[0],
    },
    {
      title: "Format-aware validators",
      description:
        "One click to run Apple's auval for Audio Units or Tracktion's bundled pluginval for VST3 / VST.",
      image_url: gallery[1],
    },
    {
      title: "Plugin metadata inspector",
      description:
        "Reads Info.plist and shows bundle ID, version, modified date, AU type/subtype/manufacturer codes, and AU category.",
      image_url: gallery[2],
    },
    {
      title: "DAW launchpad",
      description:
        "Detects installed DAWs and lets you quit, relaunch, or invalidate Ableton Live's plugin database without leaving the window.",
      image_url: gallery[0],
    },
    {
      title: "Drag-and-drop + Recents",
      description:
        "Drop a .component, .vst3, .vst, or .appex bundle. Last 12 plugins are remembered across launches.",
      image_url: gallery[0],
    },
    {
      title: "Admin-aware elevation",
      description:
        "Auto-detects when the plugin sits under /Library/Audio/Plug-Ins and prompts for elevation only when actually needed via osascript.",
      image_url: gallery[0],
    },
    {
      title: "Streaming log you can copy",
      description:
        "Every action prints to a copyable, monospace log so you can paste output into a bug report in seconds.",
      image_url: gallery[1],
    },
  ];

  // ---- 3. Build payload -------------------------------------------------
  const requirements = {
    mac: "macOS 14 Sonoma or later",
    ram: "4GB RAM",
    disk_space: "50MB Disk Space",
    format: "Standalone (Apple Silicon)",
  };

  const specifications = {
    "Format Type": "Standalone Application (Apple Silicon)",
    "Download Size": "Installer: ~15MB",
    "Delivery Format": "MAC: PKG",
    "Operating System": "macOS 14 Sonoma or later",
    "DAW Integration":
      "Detects and restarts Logic Pro, GarageBand, MainStage, Ableton Live, REAPER, Bitwig Studio, Studio One",
    "System Requirements": "4GB RAM | 50MB Disk Space | Apple Silicon",
  };

  const insertPayload = {
    name: "Plugin Play",
    slug: "plugin-play",
    tagline:
      "Test, run, and debug AU and VST3 plugins on macOS - without restarting your DAW.",
    short_description:
      "A focused macOS developer tool for plugin makers. Refresh AU/VST3 caches, run validators, and live-host one plugin at a time so you can iterate at the speed of swiftc.",
    description: DESCRIPTION,
    price: 9.99,
    sale_price: null,
    category: "application" as const,
    status: "draft" as const,
    is_featured: false,
    featured_image_url: featuredWebp,
    featured_image_url_png: featuredPng,
    logo_url: null,
    background_image_url: gallery[3],
    background_video_url: "",
    gallery_images: gallery,
    features,
    specifications,
    requirements,
    demo_video_url: null,
    demo_videos: [],
    audio_samples: [],
    download_url: null,
    download_version: null,
    downloads: [],
    meta_title: "Plugin Play - AU & VST3 Plugin Tester for macOS | NNAudio",
    meta_description:
      "Plugin Play is a focused macOS developer tool for plugin makers. Test, run, and debug Audio Unit and VST3 plugins without restarting your DAW. Live hosting, format-aware validators, and DAW launch tools in one Mac app.",
    meta_keywords:
      "plugin play, AU plugin tester, VST3 tester, Audio Unit validator, macOS plugin debugger, AU host, VST3 host, pluginval, auval, plugin developer tools, AVAudioEngine plugin host, JUCE PluginHost, NN Audio",
  };

  // ---- 4. Insert row ----------------------------------------------------
  console.log("==> Inserting products row");
  const { data: product, error: insertError } = await (admin as any)
    .from("products")
    .insert([insertPayload])
    .select()
    .single();

  if (insertError || !product) {
    console.error("Insert error:", insertError);
    process.exit(1);
  }

  console.log(`  inserted id=${product.id}\n`);

  // ---- 5. Stripe sync ---------------------------------------------------
  console.log("==> Syncing to Stripe");
  const sync = await syncProductToStripe(
    product.id,
    product.name,
    product.description || product.short_description || "",
    product.price as number,
    null,
    null,
    null,
    null
  );

  if (!sync.success) {
    console.error(`  Stripe sync failed: ${sync.error}`);
    console.error(`  Row was created (id=${product.id}) but Stripe IDs are missing. Investigate.`);
    process.exit(1);
  }

  console.log(`  stripe_product_id=${sync.stripe_product_id}`);
  console.log(`  stripe_price_id=${sync.stripe_price_id}`);

  const { error: updErr } = await (admin as any)
    .from("products")
    .update({
      stripe_product_id: sync.stripe_product_id,
      stripe_price_id: sync.stripe_price_id,
      stripe_sale_price_id: null,
    })
    .eq("id", product.id);

  if (updErr) {
    console.error("Stripe ID persist error:", updErr);
    process.exit(1);
  }

  console.log("\n=== Done ===");
  console.log(`Product:        Plugin Play`);
  console.log(`Slug:           plugin-play`);
  console.log(`Status:         draft`);
  console.log(`Price:          $${(product.price as number).toFixed(2)}`);
  console.log(`Stripe Product: ${sync.stripe_product_id}`);
  console.log(`Stripe Price:   ${sync.stripe_price_id}`);
  console.log(`Preview URL:    http://localhost:3000/product/plugin-play`);
  console.log();
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
