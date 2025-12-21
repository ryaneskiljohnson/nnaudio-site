#!/usr/bin/env tsx

/**
 * Script to check and update bucket configuration to allow any file names
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

async function checkAndUpdateBucket() {
  console.log("🔧 Checking bucket configuration...\n");

  const bucketName = "product-downloads";

  try {
    // Get bucket info
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      console.error("❌ Error listing buckets:", listError);
      return;
    }

    const bucket = buckets?.find(b => b.name === bucketName);

    if (!bucket) {
      console.error(`❌ Bucket "${bucketName}" not found`);
      return;
    }

    console.log("📋 Current Bucket Configuration:");
    console.log(JSON.stringify(bucket, null, 2));

    // Try to update bucket to remove restrictions
    console.log("\n🔧 Attempting to update bucket configuration...");
    
    // Note: Supabase Storage API might not support updating bucket config directly
    // But we can check what restrictions exist
    
    console.log("\n💡 If file names are being rejected, it might be due to:");
    console.log("   1. Bucket fileSizeLimit (check in Supabase Dashboard)");
    console.log("   2. Allowed MIME types restriction");
    console.log("   3. File name character restrictions (spaces, special chars)");
    console.log("   4. Path length limits");
    
    console.log("\n📝 To fix file name issues:");
    console.log("   - Go to Supabase Dashboard → Storage → Settings");
    console.log("   - Check 'Allowed MIME types' - should allow 'application/zip'");
    console.log("   - Remove or expand any file name restrictions");
    console.log("   - Increase file size limit if needed (default is often 50MB)");

  } catch (error: any) {
    console.error("❌ Error:", error);
  }
}

async function main() {
  await checkAndUpdateBucket();
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Failed:", error);
    process.exit(1);
  });

