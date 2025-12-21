import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const SAMPLE_LIBRARIES_PATH = '/Volumes/T7/NNAudio Sample Libraries';
const OUTPUT_DIR = path.join(process.cwd(), 'sample-zips');

// Manual mappings for products that don't match automatically
const MANUAL_MAPPINGS: Record<string, string> = {
  'game-boi': 'Game Boi Sample Archive',
  'apache': 'Apache - Native American Flute',
  'blaque': 'Blaque - Dark Electric Guitar',
  'evanescent': 'Evanescent - Baby Grand Pianio',
  'mandolele': 'Mandolele - Mandolin and Ukulele',
  'jay-harp': 'Jay Harp Sample Archive',
  'albanju': 'Albanju - Middle Eastern Banjo',
  'numb': 'Numb - Dark Acoustic Guitar',
  'noker': 'Noker - Drum and Bass',
  'quoir': 'Quoir - Mixed Vocal Choir',
  'mesosphere': 'Mesosphere Samples Archive',
  'natura': 'Natura - Sampled Analog Instrument',
  'obscura': 'Obscura Sample Archive',
  'prodigious': 'Prodigious Samples Archive',
  'reiya': 'Reiya Sample Archive',
  'rompl': 'Rompl Workstation Sample Archive',
  'strange-tingz': 'Strange Tingz Samples Archive',
  'subflux': 'Subflux Sample Archive',
  'tactures': 'Tactures Sample Archive',
  'tetrad-guitars': 'Tetrad Guitars Sample Archive',
  'tetrad-keys': 'Tetrad Keys Samples Archive',
  'tetrad-winds': 'Tetrad Winds Sample Archive',
  'curio': 'Curio-Sample-Archive',
  'digital-dreamscape': 'DigitalDreamsacpe-Sample-Archive',
  'perc-gadget': 'Perc-Gadget-Sample-Archive',
};

// Normalize product names for matching
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/\s+/g, '');
}

// Match sample library folder to product
function matchProductToSampleLibrary(
  productName: string,
  productSlug: string,
  sampleFolders: string[]
): string | null {
  const normalizedProduct = normalizeName(productName);
  const normalizedSlug = normalizeName(productSlug);

  // Extract base name from product (remove common suffixes)
  const productBase = normalizedProduct
    .replace(/sample|archive|preset|pack|plugin|instrument/g, '')
    .trim();
  const slugBase = normalizedSlug
    .replace(/sample|archive|preset|pack|plugin|instrument/g, '')
    .trim();

  // Try exact match first
  for (const folder of sampleFolders) {
    const normalizedFolder = normalizeName(folder);
    if (normalizedFolder === normalizedProduct || normalizedFolder === normalizedSlug) {
      return folder;
    }
  }

  // Try matching with base names
  for (const folder of sampleFolders) {
    const normalizedFolder = normalizeName(folder);
    const folderBase = normalizedFolder
      .replace(/sample|archive|preset|pack|plugin|instrument/g, '')
      .trim();
    
    // Check if base names match
    if (folderBase && (folderBase === productBase || folderBase === slugBase)) {
      return folder;
    }
    
    // Check if folder contains product base or vice versa
    if (folderBase && productBase && 
        (folderBase.includes(productBase) || productBase.includes(folderBase))) {
      return folder;
    }
    if (folderBase && slugBase && 
        (folderBase.includes(slugBase) || slugBase.includes(folderBase))) {
      return folder;
    }
  }

  // Try partial matches (for cases like "Game Boi Sample Archive" -> "game-boi")
  for (const folder of sampleFolders) {
    const normalizedFolder = normalizeName(folder);
    
    // Check if product name contains folder name or vice versa
    if (normalizedFolder.includes(normalizedProduct) || normalizedProduct.includes(normalizedFolder)) {
      return folder;
    }
    if (normalizedFolder.includes(normalizedSlug) || normalizedSlug.includes(normalizedFolder)) {
      return folder;
    }

    // Check for common patterns
    // e.g., "Game Boi" -> "Game Boi Sample Archive"
    if (normalizedFolder.includes('sample') && normalizedFolder.includes(normalizedProduct)) {
      return folder;
    }
    if (normalizedFolder.includes('sample') && normalizedFolder.includes(normalizedSlug)) {
      return folder;
    }
  }

  return null;
}

// Get all .ch1 files from a directory recursively
function getCh1Files(dir: string): string[] {
  const files: string[] = [];
  
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      // Skip macOS metadata
      if (entry.name.startsWith('.') || entry.name === '__MACOSX') {
        continue;
      }
      
      if (entry.isDirectory()) {
        // Recursively search subdirectories
        files.push(...getCh1Files(fullPath));
      } else if (entry.isFile() && entry.name.endsWith('.ch1')) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error);
  }
  
  return files;
}

// Create sample ZIP file
function createSampleZip(
  productSlug: string,
  sampleLibraryPath: string,
  outputPath: string
): boolean {
  try {
    // Get all .ch1 files
    const ch1Files = getCh1Files(sampleLibraryPath);
    
    if (ch1Files.length === 0) {
      console.warn(`  ⚠ No .ch1 files found in ${sampleLibraryPath}`);
      return false;
    }

    // Create temp directory for packaging
    const tempDir = path.join(OUTPUT_DIR, `temp_${productSlug}`);
    const productDir = path.join(tempDir, productSlug);
    
    // Clean up temp dir if it exists
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    fs.mkdirSync(productDir, { recursive: true });

    // Copy all .ch1 files to the product directory
    for (const ch1File of ch1Files) {
      const relativePath = path.relative(sampleLibraryPath, ch1File);
      const destPath = path.join(productDir, path.basename(ch1File));
      
      // Copy file (flatten structure - all .ch1 files in root of product folder)
      fs.copyFileSync(ch1File, destPath);
    }

    // Create ZIP file
    const zipPath = path.join(OUTPUT_DIR, `samples_${productSlug}.zip`);
    
    // Remove existing ZIP if it exists
    if (fs.existsSync(zipPath)) {
      fs.unlinkSync(zipPath);
    }

    // Create ZIP using zip command (macOS/Linux)
    const zipCommand = `cd "${tempDir}" && zip -r "${zipPath}" "${productSlug}" -x "*.DS_Store" "*__MACOSX*"`;
    execSync(zipCommand, { stdio: 'inherit' });

    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });

    // Get file size
    const stats = fs.statSync(zipPath);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

    console.log(`  ✅ Created: samples_${productSlug}.zip (${ch1Files.length} files, ${fileSizeMB} MB)`);
    return true;
  } catch (error) {
    console.error(`  ❌ Error creating ZIP for ${productSlug}:`, error);
    return false;
  }
}

async function main() {
  console.log('=== Creating Sample ZIP Files ===\n');

  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Check if sample libraries path exists
  if (!fs.existsSync(SAMPLE_LIBRARIES_PATH)) {
    console.error(`❌ Sample libraries path not found: ${SAMPLE_LIBRARIES_PATH}`);
    process.exit(1);
  }

  // Get all products from database
  console.log('Fetching products from database...');
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, slug, category')
    .eq('status', 'active')
    .order('name');

  if (error) {
    console.error('Error fetching products:', error);
    process.exit(1);
  }

  console.log(`Found ${products?.length || 0} active products\n`);

  // Get all sample library folders
  const sampleFolders = fs.readdirSync(SAMPLE_LIBRARIES_PATH, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  console.log(`Found ${sampleFolders.length} sample library folders\n`);

  // Match products to sample libraries
  const matches: Array<{
    product: any;
    sampleFolder: string;
  }> = [];

  const unmatched: string[] = [];

  for (const product of products || []) {
    // Check manual mappings first
    let matchedFolder: string | null = null;
    
    if (MANUAL_MAPPINGS[product.slug]) {
      const manualMatch = sampleFolders.find(f => f === MANUAL_MAPPINGS[product.slug]);
      if (manualMatch) {
        matchedFolder = manualMatch;
      }
    }
    
    // If no manual match, try automatic matching
    if (!matchedFolder) {
      matchedFolder = matchProductToSampleLibrary(
        product.name,
        product.slug,
        sampleFolders
      );
    }

    if (matchedFolder) {
      matches.push({
        product,
        sampleFolder: matchedFolder
      });
    } else {
      unmatched.push(`${product.name} (${product.slug})`);
    }
  }

  console.log(`\n=== Matching Results ===`);
  console.log(`✅ Matched: ${matches.length} products`);
  console.log(`❌ Unmatched: ${unmatched.length} products\n`);

  if (unmatched.length > 0) {
    console.log('Unmatched products:');
    unmatched.forEach(p => console.log(`  - ${p}`));
    console.log('');
  }

  // Create ZIP files for matched products
  console.log('=== Creating Sample ZIP Files ===\n');
  
  let successCount = 0;
  let failCount = 0;

  for (const { product, sampleFolder } of matches) {
    const sampleLibraryPath = path.join(SAMPLE_LIBRARIES_PATH, sampleFolder);
    console.log(`Processing: ${product.name} (${product.slug})`);
    console.log(`  Sample folder: ${sampleFolder}`);

    const success = createSampleZip(
      product.slug,
      sampleLibraryPath,
      OUTPUT_DIR
    );

    if (success) {
      successCount++;
    } else {
      failCount++;
    }
    console.log('');
  }

  console.log('\n=== Summary ===');
  console.log(`✅ Successfully created: ${successCount} ZIP files`);
  console.log(`❌ Failed: ${failCount} ZIP files`);
  console.log(`📁 Output directory: ${OUTPUT_DIR}`);
}

main().catch(console.error);

