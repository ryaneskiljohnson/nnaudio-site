import * as https from 'https';

async function fetchPage(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(data));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function extractProductsFromHTML(html: string): string[] {
  const products: string[] = [];
  
  // Look for woosb-item-product data-name attributes
  const productMatches = html.matchAll(/data-name="([^"]+)"/g);
  for (const match of productMatches) {
    const productName = match[1].trim();
    if (productName && !products.includes(productName)) {
      products.push(productName);
    }
  }
  
  // Also look for product links
  const linkMatches = html.matchAll(/href="https:\/\/nnaud\.io\/product\/([^\/"]+)\/"/g);
  for (const match of linkMatches) {
    const slug = match[1];
    if (slug && !slug.includes('bundle') && !slug.includes('page')) {
      // Try to find the product name from context
      const context = html.substring(Math.max(0, match.index! - 200), match.index! + 200);
      const nameMatch = context.match(/>([^<]*?)<\/a>/);
      if (nameMatch && nameMatch[1].trim().length > 0 && nameMatch[1].trim().length < 100) {
        const name = nameMatch[1].trim();
        if (!products.includes(name) && !name.includes('Add to cart') && !name.includes('Related')) {
          products.push(name);
        }
      }
    }
  }
  
  return products;
}

async function main() {
  const bundles = [
    { slug: 'analog-plugin-bundle', name: 'Analog Plugin Bundle' },
    { slug: 'modern-fx-bundle', name: 'Modern FX Bundle' },
    { slug: 'orchestral-plugin-bundle', name: 'Orchestral Plugin Bundle' },
    { slug: 'relaunch-plugin-bundle-2', name: 'Relaunch Plugin Bundle' },
  ];
  
  console.log('=== Extracting Products from Bundle Pages ===\n');
  
  for (const bundle of bundles) {
    try {
      console.log(`\n${bundle.name}:`);
      const html = await fetchPage(`https://nnaud.io/product/${bundle.slug}/`);
      const products = extractProductsFromHTML(html);
      
      if (products.length > 0) {
        console.log(`  Found ${products.length} products:`);
        products.forEach((p, i) => {
          console.log(`    ${i + 1}. ${p}`);
        });
      } else {
        console.log(`  ⚠️  No products found in HTML`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit
    } catch (error: any) {
      console.error(`  ❌ Error: ${error.message}`);
    }
  }
}

main().catch(console.error);

