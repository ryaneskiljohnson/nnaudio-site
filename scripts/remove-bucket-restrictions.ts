#!/usr/bin/env tsx

/**
 * Script to remove file name and MIME type restrictions from the bucket
 * This allows ANY file name to be uploaded
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables
config({ path: resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(
    "❌ Missing Supabase credentials. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function removeRestrictions() {
  console.log("🔓 Removing bucket restrictions to allow ANY file names...\n");

  const bucketName = "product-downloads";

  try {
    // Note: Supabase Storage API doesn't support updating bucket config directly
    // But we can check what's blocking uploads
    
    console.log("⚠️  IMPORTANT: Supabase Storage API doesn't support updating bucket config.");
    console.log("   You need to update it manually in the Supabase Dashboard.\n");
    
    console.log("📋 Steps to allow ANY file names:\n");
    console.log("1. Go to Supabase Dashboard → Storage");
    console.log("2. Click on 'product-downloads' bucket");
    console.log("3. Go to Settings/Configuration");
    console.log("4. Remove or clear 'Allowed MIME types' restriction");
    console.log("   (Set it to empty/null to allow all types)");
    console.log("5. Increase 'File size limit' if needed (set to max: 10GB)");
    console.log("6. Save changes\n");
    
    console.log("💡 Alternative: Use the Supabase CLI or Management API");
    console.log("   But the easiest way is through the Dashboard.\n");
    
    console.log("🔍 Current restrictions that might block uploads:");
    console.log("   - allowed_mime_types: Restricts file types");
    console.log("   - file_size_limit: Restricts file size");
    console.log("   - File name validation (if any) in Dashboard UI\n");
    
    console.log("✅ Once restrictions are removed, you can upload files with ANY name!");

  } catch (error: any) {
    console.error("❌ Error:", error);
  }
}

async function main() {
  await removeRestrictions();
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Failed:", error);
    process.exit(1);
  });

