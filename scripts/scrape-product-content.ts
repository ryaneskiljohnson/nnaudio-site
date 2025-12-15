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

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

interface ScrapedData {
  images: string[];
  audioFiles: string[];
  videoLinks: string[];
  description: string;
  shortDescription: string;
  features: string[];
  galleryImages: string[];
}

async function scrapeProductPage(slug: string): Promise<ScrapedData | null> {
  const url = `https://nnaud.io/product/${slug}/`;
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Scraping: ${slug}`);
  console.log(`URL: ${url}`);
  console.log(`${'='.repeat(60)}`);
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const html = await response.text();
    
    const data: ScrapedData = {
      images: [],
      audioFiles: [],
      videoLinks: [],
      description: '',
      shortDescription: '',
      features: [],
      galleryImages: []
    };
    
    // Extract images using regex - more comprehensive
    const imgRegex = /<img[^>]+(?:src|data-src|data-lazy-src|data-large_image|data-original)=["']([^"']+)["'][^>]*>/gi;
    const imgMatches = [...html.matchAll(imgRegex)];
    
    const allImageUrls = new Set<string>();
    
    for (const match of imgMatches) {
      let imgSrc = match[1];
      if (imgSrc) {
        // Clean up the URL
        imgSrc = imgSrc.replace(/^\/\//, 'https://');
        if (!imgSrc.startsWith('http')) {
          imgSrc = new URL(imgSrc, url).href;
        }
        // Normalize URL
        try {
          const urlObj = new URL(imgSrc);
          imgSrc = urlObj.href;
          if (imgSrc && !allImageUrls.has(imgSrc)) {
            allImageUrls.add(imgSrc);
            // Filter out common non-product images
            if (!imgSrc.includes('logo') && 
                !imgSrc.includes('icon') && 
                !imgSrc.includes('avatar') &&
                !imgSrc.includes('wp-content/themes') &&
                !imgSrc.includes('placeholder') &&
                !imgSrc.includes('spinner') &&
                !imgSrc.includes('gravatar') &&
                (imgSrc.includes('uploads') || imgSrc.includes('product'))) {
              data.images.push(imgSrc);
              console.log(`  ✓ Image: ${imgSrc.substring(0, 80)}...`);
            }
          }
        } catch (e) {
          // Invalid URL, skip
        }
      }
    }
    
    // Extract audio files from audio players (Sonaar, etc.)
    // Look for data-src or src attributes in audio elements
    const audioRegex = /<audio[^>]+(?:src|data-src)=["']([^"']+)["'][^>]*>/gi;
    const audioMatches = [...html.matchAll(audioRegex)];
    for (const match of audioMatches) {
      let audioSrc = match[1];
      if (audioSrc && !audioSrc.startsWith('http')) {
        audioSrc = new URL(audioSrc, url).href;
      }
      if (audioSrc && !data.audioFiles.includes(audioSrc)) {
        data.audioFiles.push(audioSrc);
        console.log(`  ✓ Audio: ${audioSrc}`);
      }
    }
    
    // Extract audio from Sonaar player - look for JSON data
    const sonaarDataRegex = /data-src=["']([^"']*\.(mp3|wav|ogg|m4a))["']/gi;
    const sonaarDataMatches = [...html.matchAll(sonaarDataRegex)];
    for (const match of sonaarDataMatches) {
      let audioSrc = match[1];
      if (audioSrc && !audioSrc.startsWith('http')) {
        audioSrc = new URL(audioSrc, url).href;
      }
      if (audioSrc && !data.audioFiles.includes(audioSrc)) {
        data.audioFiles.push(audioSrc);
        console.log(`  ✓ Audio (Sonaar data): ${audioSrc}`);
      }
    }
    
    // Extract audio from Sonaar player JSON configuration - try multiple patterns
    // Pattern 1: data-playlist attribute
    let sonaarJsonRegex = /iron-audioplayer[^>]*data-playlist=["']([^"']+)["']/gi;
    let sonaarJsonMatches = [...html.matchAll(sonaarJsonRegex)];
    for (const match of sonaarJsonMatches) {
      try {
        const encoded = match[1];
        const decoded = decodeURIComponent(encoded);
        const jsonData = JSON.parse(decoded);
        if (jsonData.tracks && Array.isArray(jsonData.tracks)) {
          for (const track of jsonData.tracks) {
            if (track.src) {
              let audioSrc = track.src;
              if (!audioSrc.startsWith('http')) {
                audioSrc = new URL(audioSrc, url).href;
              }
              if (audioSrc && !data.audioFiles.includes(audioSrc)) {
                data.audioFiles.push(audioSrc);
                console.log(`  ✓ Audio (Sonaar track): ${audioSrc}`);
              }
            }
          }
        }
      } catch (e) {
        // Try unescaped
        try {
          const jsonData = JSON.parse(match[1]);
          if (jsonData.tracks && Array.isArray(jsonData.tracks)) {
            for (const track of jsonData.tracks) {
              if (track.src) {
                let audioSrc = track.src;
                if (!audioSrc.startsWith('http')) {
                  audioSrc = new URL(audioSrc, url).href;
                }
                if (audioSrc && !data.audioFiles.includes(audioSrc)) {
                  data.audioFiles.push(audioSrc);
                  console.log(`  ✓ Audio (Sonaar track): ${audioSrc}`);
                }
              }
            }
          }
        } catch (e2) {
          // Not valid JSON, skip
        }
      }
    }
    
    // Pattern 2: Look for Sonaar player script initialization
    const sonaarScriptRegex = /sonaar.*?tracks.*?\[(.*?)\]/gis;
    const sonaarScriptMatches = [...html.matchAll(sonaarScriptRegex)];
    for (const match of sonaarScriptMatches) {
      // Try to extract URLs from the tracks array
      const urlRegex = /(https?:\/\/[^\s"']+\.(mp3|wav|ogg|m4a))/gi;
      const urlMatches = [...match[0].matchAll(urlRegex)];
      for (const urlMatch of urlMatches) {
        const audioSrc = urlMatch[1];
        if (audioSrc && !data.audioFiles.includes(audioSrc)) {
          data.audioFiles.push(audioSrc);
          console.log(`  ✓ Audio (Sonaar script): ${audioSrc}`);
        }
      }
    }
    
    // Look for audio in script tags (Sonaar embeds data in scripts)
    const scriptRegex = /<script[^>]*>(.*?)<\/script>/gis;
    const scriptMatches = [...html.matchAll(scriptRegex)];
    for (const match of scriptMatches) {
      const scriptContent = match[1];
      // Look for audio URLs in scripts
      const audioUrlRegex = /(https?:\/\/[^\s"']+\.(mp3|wav|ogg|m4a))/gi;
      const audioUrlMatches = [...scriptContent.matchAll(audioUrlRegex)];
      for (const urlMatch of audioUrlMatches) {
        const audioSrc = urlMatch[1];
        if (audioSrc && !data.audioFiles.includes(audioSrc)) {
          data.audioFiles.push(audioSrc);
          console.log(`  ✓ Audio (script): ${audioSrc}`);
        }
      }
    }
    
    // Extract audio links
    const audioLinkRegex = /<a[^>]+href=["']([^"']*\.(mp3|wav|ogg|m4a))["'][^>]*>/gi;
    const audioLinkMatches = [...html.matchAll(audioLinkRegex)];
    for (const match of audioLinkMatches) {
      let audioHref = match[1];
      if (audioHref && !audioHref.startsWith('http')) {
        audioHref = new URL(audioHref, url).href;
      }
      if (audioHref && !data.audioFiles.includes(audioHref)) {
        data.audioFiles.push(audioHref);
        console.log(`  ✓ Audio link: ${audioHref}`);
      }
    }
    
    // Extract video links
    const videoRegex = /<video[^>]+src=["']([^"']+)["'][^>]*>/gi;
    const videoMatches = [...html.matchAll(videoRegex)];
    for (const match of videoMatches) {
      let videoSrc = match[1];
      if (videoSrc && !videoSrc.startsWith('http')) {
        videoSrc = new URL(videoSrc, url).href;
      }
      if (videoSrc && !data.videoLinks.includes(videoSrc)) {
        data.videoLinks.push(videoSrc);
        console.log(`  ✓ Video: ${videoSrc}`);
      }
    }
    
    // Extract iframe videos (YouTube, Vimeo)
    const iframeRegex = /<iframe[^>]+src=["']([^"']+)["'][^>]*>/gi;
    const iframeMatches = [...html.matchAll(iframeRegex)];
    for (const match of iframeMatches) {
      const iframeSrc = match[1];
      if (iframeSrc && (iframeSrc.includes('youtube') || iframeSrc.includes('vimeo') || iframeSrc.includes('video'))) {
        if (!data.videoLinks.includes(iframeSrc)) {
          data.videoLinks.push(iframeSrc);
          console.log(`  ✓ Video iframe: ${iframeSrc.substring(0, 80)}...`);
        }
      }
    }
    
    // Extract description - try multiple patterns
    // Try WooCommerce short description first
    let shortDescMatch = html.match(/<div[^>]*class="[^"]*woocommerce-product-details__short-description[^"]*"[^>]*>(.*?)<\/div>/is);
    if (!shortDescMatch) {
      shortDescMatch = html.match(/<div[^>]*class="[^"]*product-short-description[^"]*"[^>]*>(.*?)<\/div>/is);
    }
    if (!shortDescMatch) {
      shortDescMatch = html.match(/<div[^>]*class="[^"]*entry-summary[^"]*"[^>]*>(.*?)<\/div>/is);
    }
    
    if (shortDescMatch) {
      data.shortDescription = shortDescMatch[1]
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 500);
      if (data.shortDescription) {
        console.log(`  ✓ Short description: ${data.shortDescription.length} chars`);
      }
    }
    
    // Extract full description - try multiple patterns
    // Try tab description first (most common on WooCommerce) - use non-greedy with larger capture
    let descMatch = html.match(/<div[^>]*class="[^"]*woocommerce-Tabs-panel[^"]*description[^"]*"[^>]*>(.*?)(?:<\/div>\s*<\/div>|<\/div>\s*<div[^>]*class="[^"]*woocommerce-Tabs-panel)/is);
    if (!descMatch) {
      descMatch = html.match(/<div[^>]*class="[^"]*woocommerce-product-details__description[^"]*"[^>]*>(.*?)(?:<\/div>\s*<\/div>|<\/div>\s*<div[^>]*class="[^"]*woocommerce)/is);
    }
    if (!descMatch) {
      descMatch = html.match(/<div[^>]*class="[^"]*product-description[^"]*"[^>]*>(.*?)(?:<\/div>\s*<\/div>|<\/div>\s*<div[^>]*class="[^"]*product)/is);
    }
    if (!descMatch) {
      descMatch = html.match(/<div[^>]*class="[^"]*entry-content[^"]*"[^>]*>(.*?)(?:<\/div>\s*<\/div>|<\/div>\s*<div[^>]*class="[^"]*entry)/is);
    }
    if (!descMatch) {
      descMatch = html.match(/<div[^>]*id="[^"]*product-description[^"]*"[^>]*>(.*?)(?:<\/div>\s*<\/div>|<\/div>\s*<div[^>]*id="[^"]*tab)/is);
    }
    // Also try to get content between description tab and next tab
    if (!descMatch || descMatch[1].length < 100) {
      const tabMatch = html.match(/id="tab-description"[^>]*>.*?<\/h2>(.*?)(?:<div[^>]*id="tab-|<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>)/is);
      if (tabMatch && tabMatch[1].length > (descMatch?.[1].length || 0)) {
        descMatch = tabMatch;
      }
    }
    
    // Extract initial description from descMatch
    let initialDescription = '';
    if (descMatch) {
      const descHtml = descMatch[1];
      // Extract paragraphs
      const pMatches = descHtml.match(/<p[^>]*>(.*?)<\/p>/gis);
      if (pMatches && pMatches.length > 0) {
        initialDescription = pMatches
          .map(m => m.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
          .filter(p => p.length > 10)
          .join('\n\n');
      } else {
        // Try to extract text content
        initialDescription = descHtml
          .replace(/<script[^>]*>.*?<\/script>/gis, '')
          .replace(/<style[^>]*>.*?<\/style>/gis, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      }
      if (initialDescription) {
        console.log(`  ✓ Description: ${initialDescription.length} chars`);
      }
    }
    
    // Start with initial description and try to find better ones
    let bestDescription = initialDescription;
    
    // Try to extract from the main content area if description is still short
    if (!bestDescription || bestDescription.length < 100) {
      const mainContentMatch = html.match(/<main[^>]*>(.*?)<\/main>/is);
      if (mainContentMatch) {
        const mainContent = mainContentMatch[1];
        // Look for paragraphs in main content
        const mainPMatches = mainContent.match(/<p[^>]*>(.*?)<\/p>/gis);
        if (mainPMatches && mainPMatches.length > 0) {
          const mainDesc = mainPMatches
            .map(m => m.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
            .filter(p => p.length > 20)
            .join('\n\n');
          if (mainDesc.length > bestDescription.length) {
            bestDescription = mainDesc;
            console.log(`  ✓ Description (main content): ${bestDescription.length} chars`);
          }
        }
      }
    }
    
    // Try to get any text content from the page if we still don't have a good description
    if (!bestDescription || bestDescription.length < 100) {
      // Look for any large text blocks that might be descriptions
      const textBlocks = html.match(/<p[^>]*>(.{50,})<\/p>/gis);
      if (textBlocks && textBlocks.length > 0) {
        const combinedText = textBlocks
          .map(t => t.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
          .filter(t => t.length > 50 && !t.includes('cookie') && !t.includes('privacy'))
          .slice(0, 5)
          .join('\n\n');
        if (combinedText.length > bestDescription.length) {
          bestDescription = combinedText;
          console.log(`  ✓ Description (text blocks): ${bestDescription.length} chars`);
        }
      }
    }
    
    // Use the best description we found
    if (bestDescription.length > 0) {
      data.description = bestDescription;
    }
    
    // Extract features (look for lists)
    const featuresMatch = html.match(/<ul[^>]*class="[^"]*product-features[^"]*"[^>]*>(.*?)<\/ul>/is);
    if (featuresMatch) {
      const liMatches = featuresMatch[1].match(/<li[^>]*>(.*?)<\/li>/gis);
      if (liMatches) {
        for (const li of liMatches) {
          const feature = li.replace(/<[^>]+>/g, '').trim();
          if (feature && feature.length > 10 && !data.features.includes(feature)) {
            data.features.push(feature);
            console.log(`  ✓ Feature: ${feature.substring(0, 50)}...`);
          }
        }
      }
    }
    
    // Gallery images (from product gallery) - get all sizes
    const galleryMatch = html.match(/<div[^>]*class="[^"]*woocommerce-product-gallery[^"]*"[^>]*>(.*?)<\/div>/is);
    if (galleryMatch) {
      const galleryImgMatches = galleryMatch[1].matchAll(imgRegex);
      for (const match of galleryImgMatches) {
        let imgSrc = match[1];
        if (imgSrc && !imgSrc.startsWith('http')) {
          imgSrc = new URL(imgSrc, url).href;
        }
        // Get the full-size image URL (remove size suffixes)
        if (imgSrc) {
          const fullSizeUrl = imgSrc.replace(/-\d+x\d+\.(webp|jpg|jpeg|png)/i, '.$1');
          if (fullSizeUrl && !data.galleryImages.includes(fullSizeUrl) && !data.images.includes(fullSizeUrl)) {
            data.galleryImages.push(fullSizeUrl);
            console.log(`  ✓ Gallery image: ${fullSizeUrl.substring(0, 80)}...`);
          }
        }
      }
    }
    
    // Also extract data-large_image attributes (WooCommerce full-size images)
    const largeImageRegex = /data-large_image=["']([^"']+)["']/gi;
    const largeImageMatches = [...html.matchAll(largeImageRegex)];
    for (const match of largeImageMatches) {
      let imgSrc = match[1];
      if (imgSrc && !imgSrc.startsWith('http')) {
        imgSrc = new URL(imgSrc, url).href;
      }
      if (imgSrc && !data.galleryImages.includes(imgSrc) && !data.images.includes(imgSrc)) {
        data.galleryImages.push(imgSrc);
        console.log(`  ✓ Large image: ${imgSrc.substring(0, 80)}...`);
      }
    }
    
    console.log(`\n  Summary:`);
    console.log(`    Images: ${data.images.length + data.galleryImages.length}`);
    console.log(`    Audio files: ${data.audioFiles.length}`);
    console.log(`    Video links: ${data.videoLinks.length}`);
    console.log(`    Features: ${data.features.length}`);
    
    return data;
    
  } catch (error) {
    console.error(`  ✗ Error scraping ${slug}:`, error);
    return null;
  }
}

async function updateProductInDb(productId: string, data: ScrapedData) {
  try {
    const updates: any = {
      updated_at: new Date().toISOString()
    };
    
    // Always update description if we have one that's better
    if (data.description && data.description.length > 0) {
      // Get current description to compare
      const { data: currentProduct } = await supabase
        .from('products')
        .select('description')
        .eq('id', productId)
        .single();
      
      const currentDescLength = currentProduct?.description?.length || 0;
      
      // Update if new description is significantly longer (at least 50 chars more)
      // or if current description is very short (< 50 chars)
      if (currentDescLength < 50 || data.description.length > currentDescLength + 50) {
        updates.description = data.description;
        console.log(`  ✓ Saving description: ${data.description.length} chars (was ${currentDescLength} chars)`);
      } else {
        console.log(`  ⚠ Keeping existing description: ${currentDescLength} chars (new: ${data.description.length} chars)`);
      }
    }
    
    if (data.shortDescription) {
      updates.short_description = data.shortDescription;
    }
    
    if (data.galleryImages.length > 0) {
      updates.gallery_images = data.galleryImages;
    }
    
    if (data.audioFiles.length > 0) {
      updates.audio_samples = data.audioFiles.map(url => ({
        url,
        name: url.split('/').pop() || 'audio'
      }));
    }
    
    if (data.videoLinks.length > 0) {
      updates.demo_video_url = data.videoLinks[0];
    }
    
    if (data.features.length > 0) {
      updates.features = data.features;
    }
    
    const { error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', productId);
    
    if (error) {
      throw error;
    }
    
    console.log(`  ✓ Updated product in database`);
    return true;
  } catch (error) {
    console.error(`  ✗ Error updating database:`, error);
    return false;
  }
}

async function main() {
  const slug = process.argv[2];
  
  if (!slug) {
    console.error('Usage: npx tsx scripts/scrape-product-content.ts <slug>');
    console.error('Example: npx tsx scripts/scrape-product-content.ts 20-for-20-midi-bundle-1');
    process.exit(1);
  }
  
  // Get product ID from database
  const { data: product, error } = await supabase
    .from('products')
    .select('id')
    .eq('slug', slug)
    .single();
  
  if (error || !product) {
    console.error(`✗ Product with slug '${slug}' not found in database`);
    process.exit(1);
  }
  
  // Scrape product page
  const scrapedData = await scrapeProductPage(slug);
  
  if (!scrapedData) {
    console.error('✗ Failed to scrape product page');
    process.exit(1);
  }
  
  // Update database
  await updateProductInDb(product.id, scrapedData);
  
  console.log(`\n✅ Complete!`);
}

main().catch(console.error);
