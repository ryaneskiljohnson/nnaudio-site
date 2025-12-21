#!/usr/bin/env tsx

/**
 * Test S3 connection to Supabase Storage
 */

import { S3Client, ListBucketsCommand } from "@aws-sdk/client-s3";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const S3_ACCESS_KEY_ID = process.env.SUPABASE_S3_ACCESS_KEY_ID;
const S3_SECRET_ACCESS_KEY = process.env.SUPABASE_S3_SECRET_ACCESS_KEY;
const S3_REGION = process.env.SUPABASE_S3_REGION || "us-west-2";

if (!supabaseUrl || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) {
  console.error("❌ Missing credentials");
  process.exit(1);
}

const projectRef = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/)?.[1];
if (!projectRef) {
  console.error("❌ Could not extract project reference");
  process.exit(1);
}

console.log("🔌 Testing S3 Connection...\n");
console.log(`Project Ref: ${projectRef}`);
console.log(`Region: ${S3_REGION}`);
console.log(`Endpoint: https://${projectRef}.storage.supabase.co/storage/v1/s3\n`);

const s3Client = new S3Client({
  forcePathStyle: true,
  region: S3_REGION,
  endpoint: `https://${projectRef}.storage.supabase.co/storage/v1/s3`,
  credentials: {
    accessKeyId: S3_ACCESS_KEY_ID,
    secretAccessKey: S3_SECRET_ACCESS_KEY,
  },
});

async function testConnection() {
  try {
    console.log("📤 Testing connection...");
    const command = new ListBucketsCommand({});
    const response = await s3Client.send(command);
    
    console.log("✅ Connection successful!\n");
    console.log("📦 Available buckets:");
    if (response.Buckets && response.Buckets.length > 0) {
      response.Buckets.forEach(bucket => {
        console.log(`   - ${bucket.Name}`);
      });
    } else {
      console.log("   (No buckets found)");
    }
    
    return true;
  } catch (error: any) {
    console.error("❌ Connection failed:", error.message || String(error));
    if (error.Code) {
      console.error(`   Error Code: ${error.Code}`);
    }
    return false;
  }
}

testConnection().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});

