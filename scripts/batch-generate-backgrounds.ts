/**
 * @fileoverview Batch generate background images and upload to Supabase
 * @module scripts/batch-generate-backgrounds
 * 
 * Generates images in batches and uploads them to Supabase storage.
 * Tracks progress to support resuming interrupted sessions.
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface ImagePrompt {
  productId: string;
  productName: string;
  slug: string;
  prompt: string;
  filename: string;
}

interface ProgressTracker {
  total: number;
  completed: number;
  failed: number;
  generated: string[];
  errors: Array<{ productId: string; productName: string; error: string }>;
}

const OUTPUT_DIR = 'generated-backgrounds';
const PROGRESS_FILE = path.join(OUTPUT_DIR, 'progress.json');

/**
 * @brief Load progress from file
 */
function loadProgress(): ProgressTracker {
  if (fs.existsSync(PROGRESS_FILE)) {
    return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
  }
  return {
    total: 0,
    completed: 0,
    failed: 0,
    generated: [],
    errors: []
  };
}

/**
 * @brief Save progress to file
 */
function saveProgress(progress: ProgressTracker) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

/**
 * @brief Upload image to Supabase storage
 */
async function uploadToSupabase(filePath: string, productSlug: string): Promise<string | null> {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const fileName = `product-backgrounds/${productSlug}-background.png`;
    
    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(fileName, fileBuffer, {
        contentType: 'image/png',
        upsert: true
      });
    
    if (error) {
      console.error(`  ❌ Upload failed: ${error.message}`);
      return null;
    }
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(fileName);
    
    return urlData.publicUrl;
  } catch (err: any) {
    console.error(`  ❌ Upload error: ${err.message}`);
    return null;
  }
}

/**
 * @brief Update product with background image URL
 */
async function updateProduct(productId: string, imageUrl: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('products')
      .update({ background_image_url: imageUrl })
      .eq('id', productId);
    
    if (error) {
      console.error(`  ❌ DB update failed: ${error.message}`);
      return false;
    }
    
    return true;
  } catch (err: any) {
    console.error(`  ❌ DB error: ${err.message}`);
    return false;
  }
}

/**
 * @brief Main execution function
 */
async function main() {
  console.log('\n🎨 Batch Background Image Generator\n');
  
  // Load prompts
  const promptsFile = path.join(OUTPUT_DIR, 'image-prompts.json');
  if (!fs.existsSync(promptsFile)) {
    console.error('Prompts file not found. Run generate-product-backgrounds.ts first.');
    process.exit(1);
  }
  
  const { prompts } = JSON.parse(fs.readFileSync(promptsFile, 'utf-8')) as { prompts: ImagePrompt[] };
  
  // Load progress
  let progress = loadProgress();
  progress.total = prompts.length;
  
  console.log(`Total products: ${progress.total}`);
  console.log(`Already completed: ${progress.completed}`);
  console.log(`Failed: ${progress.failed}\n`);
  
  // NOTE: This script prepares the infrastructure but image generation
  // will be done manually using the MCP image generator tool
  console.log('⚠️  Image generation must be done manually using MCP tools.');
  console.log('This script will help track progress and upload completed images.\n');
  
  // Check for images that exist but haven't been uploaded
  for (const prompt of prompts) {
    if (progress.generated.includes(prompt.productId)) {
      console.log(`✅ ${prompt.productName} - already processed`);
      continue;
    }
    
    const imagePath = path.join(OUTPUT_DIR, prompt.filename);
    
    if (fs.existsSync(imagePath)) {
      console.log(`📤 ${prompt.productName} - uploading...`);
      
      // Upload to Supabase
      const imageUrl = await uploadToSupabase(imagePath, prompt.slug);
      
      if (imageUrl) {
        // Update product
        const updated = await updateProduct(prompt.productId, imageUrl);
        
        if (updated) {
          progress.generated.push(prompt.productId);
          progress.completed++;
          console.log(`  ✅ Uploaded and linked: ${imageUrl}\n`);
        } else {
          progress.failed++;
          progress.errors.push({
            productId: prompt.productId,
            productName: prompt.productName,
            error: 'Failed to update database'
          });
        }
      } else {
        progress.failed++;
        progress.errors.push({
          productId: prompt.productId,
          productName: prompt.productName,
          error: 'Failed to upload to storage'
        });
      }
      
      saveProgress(progress);
    } else {
      console.log(`⏳ ${prompt.productName} - waiting for image generation`);
    }
  }
  
  console.log('\n📊 Final Status:');
  console.log(`Total: ${progress.total}`);
  console.log(`Completed: ${progress.completed}`);
  console.log(`Failed: ${progress.failed}`);
  console.log(`Remaining: ${progress.total - progress.completed - progress.failed}\n`);
  
  if (progress.errors.length > 0) {
    console.log('❌ Errors:');
    progress.errors.forEach(err => {
      console.log(`  - ${err.productName}: ${err.error}`);
    });
  }
}

if (require.main === module) {
  main().catch(console.error);
}
