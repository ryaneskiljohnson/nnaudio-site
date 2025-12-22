import * as fs from 'fs';
import * as path from 'path';

const PRODUCTION_DIR = '/Volumes/T7/Plugin Builds/production';

// Clean up filename: remove hyphens, collapse multiple underscores
function cleanFileName(fileName: string): string {
  // Remove hyphens
  let cleaned = fileName.replace(/-/g, '_');
  // Collapse multiple underscores to single underscore
  cleaned = cleaned.replace(/_+/g, '_');
  // Remove leading/trailing underscores
  cleaned = cleaned.replace(/^_+|_+$/g, '');
  return cleaned;
}

async function main() {
  console.log('=== Renaming Plugin ZIP Files ===\n');
  console.log(`Source: ${PRODUCTION_DIR}\n`);
  
  // Get all ZIP files
  const zipFiles = fs.readdirSync(PRODUCTION_DIR)
    .filter(file => file.endsWith('.zip') && file.startsWith('plugin_'))
    .map(file => ({
      oldName: file,
      oldPath: path.join(PRODUCTION_DIR, file),
    }))
    .sort((a, b) => a.oldName.localeCompare(b.oldName));
  
  console.log(`Found ${zipFiles.length} plugin ZIP files\n`);
  
  let renamedCount = 0;
  let skippedCount = 0;
  
  for (const { oldName, oldPath } of zipFiles) {
    // Clean up filename
    const newFileName = cleanFileName(oldName);
    const newPath = path.join(PRODUCTION_DIR, newFileName);
    
    // Skip if already cleaned
    if (oldName === newFileName) {
      skippedCount++;
      continue;
    }
    
    console.log(`Renaming: ${oldName}`);
    console.log(`  -> ${newFileName}`);
    
    try {
      // Rename locally
      fs.renameSync(oldPath, newPath);
      console.log(`  ✅ Renamed\n`);
      renamedCount++;
    } catch (error: any) {
      console.error(`  ❌ Error: ${error.message}\n`);
    }
  }
  
  console.log(`=== Summary ===`);
  console.log(`✅ Renamed: ${renamedCount}`);
  console.log(`⏭️  Skipped (already clean): ${skippedCount}`);
}

main().catch(console.error);

