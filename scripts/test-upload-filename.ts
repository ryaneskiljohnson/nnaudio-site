#!/usr/bin/env tsx

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";
import * as fs from "fs";

config({ path: resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const testFile = '/Volumes/T7/NNAudio Sample Libraries 2/samples_Curio-Sample-Archive.zip';
const storagePath = 'products/curio-texture-generator/samples_Curio-Sample-Archive.zip';

console.log('Testing upload...');
console.log('File:', testFile);
console.log('Storage path:', storagePath);

if (!fs.existsSync(testFile)) {
  console.error('File not found!');
  process.exit(1);
}

const fileBuffer = fs.readFileSync(testFile);
console.log('File size:', fileBuffer.length, 'bytes');

const { data, error } = await supabase.storage
  .from("product-downloads")
  .upload(storagePath, fileBuffer, {
    contentType: "application/zip",
    upsert: true,
  });

if (error) {
  console.error('ERROR:', error);
  console.error('Error message:', error.message);
  console.error('Error status:', error.statusCode);
} else {
  console.log('SUCCESS:', data);
}

