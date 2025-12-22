import * as https from 'https';
import * as http from 'http';

async function fetchPage(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(data));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function extractBundleInfo(html: string, slug: string) {
  // Look for product names in the HTML
  const productMatches = html.match(/<[^>]*>([^<]*?(?:FreeQ|Freeverb|Freelay|Curves|Crystal Ball|Digital Echoes|Sterfreeo)[^<]*)</gi);
  
  console.log(`\n${slug}:`);
  if (productMatches) {
    productMatches.forEach(match => {
      const clean = match.replace(/<[^>]*>/g, '').trim();
      if (clean.length > 0 && clean.length < 100) {
        console.log(`  Found: ${clean}`);
      }
    });
  }
  
  // Look for description
  const descMatch = html.match(/<meta[^>]*description[^>]*content="([^"]*)"/i) || 
                    html.match(/<p[^>]*class="[^"]*description[^"]*"[^>]*>([^<]*)</i);
  if (descMatch) {
    console.log(`  Description: ${descMatch[1].substring(0, 200)}`);
  }
}

async function main() {
  const bundles = [
    'analog-plugin-bundle',
    'all-guitar-bundle',
    'atmosphere-bundle',
    'cthulhu-bundle-1-xmas-2023',
    'cthulhu-bundle-2-xmas-2023',
    'drum-bass-bundle-2',
    'drum-perc-bundle',
    'guitar-bundle-xmas-2023',
    'modern-fx-bundle',
    'modern-song-constructions-bundle',
    'modern-workstation-bundle-xmas-2023',
    'orchestra-bundle-xmas-2023',
    'orchestral-plugin-bundle',
    'relaunch-plugin-bundle-2',
    'soundscapes-bundle-xmas-2023',
    'selection-box-bundle-xmas-2023',
    'summer-sample-pack-bundle',
  ];
  
  for (const slug of bundles) {
    try {
      const html = await fetchPage(`https://nnaud.io/product/${slug}/`);
      await extractBundleInfo(html, slug);
      await new Promise(resolve => setTimeout(resolve, 500)); // Rate limit
    } catch (error) {
      console.error(`Error fetching ${slug}:`, error);
    }
  }
}

main().catch(console.error);

