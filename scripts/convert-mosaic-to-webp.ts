import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';

async function convertMosaicToWebP() {
  const inputPath = '/Users/rjmacbookpro/Downloads/mosaic.png';
  const outputDir = path.join(process.cwd(), 'public', 'images', 'nnaud-io');
  const outputPath = path.join(outputDir, 'hero-mosaic.webp');

  // Ensure directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  try {
    console.log('Converting mosaic.png to WebP...');
    
    await sharp(inputPath)
      .webp({ quality: 85 })
      .toFile(outputPath);

    const stats = fs.statSync(outputPath);
    console.log(`✅ Converted and saved to: ${outputPath}`);
    console.log(`   File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
  } catch (error: any) {
    console.error('❌ Error converting image:', error.message);
    process.exit(1);
  }
}

convertMosaicToWebP().catch(console.error);
