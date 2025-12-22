import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const PLUGIN_BUILDS_DIR = '/Volumes/T7/Plugin Builds';
const PRODUCTION_DIR = path.join(PLUGIN_BUILDS_DIR, 'production');

// Ensure production directory exists
if (!fs.existsSync(PRODUCTION_DIR)) {
  fs.mkdirSync(PRODUCTION_DIR, { recursive: true });
}

function getProductNames(): string[] {
  const files = fs.readdirSync(PLUGIN_BUILDS_DIR);
  const productNames = new Set<string>();

  files.forEach((file) => {
    if (file.endsWith('.component') && !file.startsWith('._')) {
      const productName = file.replace('.component', '');
      productNames.add(productName);
    }
  });

  return Array.from(productNames).sort();
}

function sanitizeFileName(name: string): string {
  // Remove or replace characters that aren't safe for filenames
  return name
    .replace(/[^a-zA-Z0-9\s\-_]/g, '')
    .replace(/\s+/g, '_')
    .toLowerCase();
}

function packageProduct(productName: string): boolean {
  console.log(`\nProcessing: ${productName}`);

  const vst3Path = path.join(PLUGIN_BUILDS_DIR, `${productName}.vst3`);
  const componentPath = path.join(PLUGIN_BUILDS_DIR, `${productName}.component`);

  // Check if both files exist
  if (!fs.existsSync(vst3Path)) {
    console.log(`  ⚠️  VST3 not found: ${productName}.vst3`);
    return false;
  }

  if (!fs.existsSync(componentPath)) {
    console.log(`  ⚠️  Component not found: ${productName}.component`);
    return false;
  }

  // Create temp directory for this product
  const tempDir = path.join(PRODUCTION_DIR, `temp_${sanitizeFileName(productName)}`);
  const macDir = path.join(tempDir, 'Mac');

  // Clean up temp dir if it exists
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  fs.mkdirSync(macDir, { recursive: true });

  // Copy VST3 and Component to Mac folder
  console.log(`  Copying VST3...`);
  const vst3Dest = path.join(macDir, `${productName}.vst3`);
  execSync(`cp -R "${vst3Path}" "${vst3Dest}"`, { stdio: 'inherit' });

  console.log(`  Copying Component...`);
  const componentDest = path.join(macDir, `${productName}.component`);
  execSync(`cp -R "${componentPath}" "${componentDest}"`, { stdio: 'inherit' });

  // Create ZIP file
  const zipFileName = `plugin_${sanitizeFileName(productName)}.zip`;
  const zipPath = path.join(PRODUCTION_DIR, zipFileName);

  // Remove existing ZIP if it exists
  if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
  }

  console.log(`  Creating ZIP: ${zipFileName}...`);
  try {
    // Create ZIP from the Mac folder
    execSync(`cd "${tempDir}" && zip -r "${zipPath}" Mac -x "*.DS_Store" "*__MACOSX*" "._*"`, {
      stdio: 'inherit',
    });

    // Get file size
    const stats = fs.statSync(zipPath);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`  ✅ Created: ${zipFileName} (${fileSizeMB} MB)`);

    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });

    return true;
  } catch (error) {
    console.error(`  ❌ Error creating ZIP:`, error);
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    return false;
  }
}

async function main() {
  console.log('=== Packaging Plugin Builds ===\n');
  console.log(`Source: ${PLUGIN_BUILDS_DIR}`);
  console.log(`Destination: ${PRODUCTION_DIR}\n`);

  const productNames = getProductNames();
  console.log(`Found ${productNames.length} products:\n`);

  let successCount = 0;
  let failCount = 0;

  for (const productName of productNames) {
    if (packageProduct(productName)) {
      successCount++;
    } else {
      failCount++;
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`✅ Successfully packaged: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`📦 Total ZIPs created: ${successCount}`);
  console.log(`\nAll ZIPs are in: ${PRODUCTION_DIR}`);
}

main().catch(console.error);

