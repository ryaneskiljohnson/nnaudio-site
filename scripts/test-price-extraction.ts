const html = `<h1 class="product_title entry-title">Albanju</h1>
	<div class="woocommerce-product-rating">
		<div class="star-rating" role="img" aria-label="Rated 4.00 out of 5"><span style="width:80%">Rated <strong class="rating">4.00</strong> out of 5 based on <span class="rating">1</span> customer rating</span></div>								<a href="#reviews" class="woocommerce-review-link" rel="nofollow">(<span class="count">1</span> customer review)</a>
						</div>

<p class="price"><del aria-hidden="true"><span class="woocommerce-Price-amount amount"><bdi><span class="woocommerce-Price-currencySymbol">&#36;</span>19.95</bdi></span></del> <span class="screen-reader-text">Original price was: &#036;19.95.</span><ins aria-hidden="true"><span class="woocommerce-Price-amount amount"><bdi><span class="woocommerce-Price-currencySymbol">&#36;</span>14.95</bdi></span></ins><span class="screen-reader-text">Current price is: &#036;14.95.</span></p>`;

function extractPrices(html: string, productSlug: string): { price: number | null; salePrice: number | null } {
  let price: number | null = null;
  let salePrice: number | null = null;
  
  // Find the main product content area - look for product_title followed by price
  const productTitleMatch = html.match(/<h1[^>]*class="[^"]*product_title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i);
  
  console.log('Title match:', productTitleMatch ? 'found' : 'not found');
  
  if (productTitleMatch) {
    // Get the section after the product title (should contain the main price)
    const titleIndex = productTitleMatch.index! + productTitleMatch[0].length;
    const contentAfterTitle = html.substring(titleIndex, titleIndex + 2000); // Look in next 2000 chars
    
    console.log('Content after title (first 500 chars):', contentAfterTitle.substring(0, 500));
    
    // Look for price in this section
    const priceBlockMatch = contentAfterTitle.match(/<p[^>]*class="[^"]*price[^"]*"[^>]*>([\s\S]*?)<\/p>/i);
    
    console.log('Price block match:', priceBlockMatch ? 'found' : 'not found');
    
    if (priceBlockMatch) {
      const priceBlock = priceBlockMatch[1];
      console.log('Price block:', priceBlock);
      
      // Check if there's a del (original price) and ins (sale price)
      const delMatch = priceBlock.match(/<del[^>]*>[\s\S]*?<bdi[^>]*>[\s\S]*?(\d+\.?\d*)/i);
      const insMatch = priceBlock.match(/<ins[^>]*>[\s\S]*?<bdi[^>]*>[\s\S]*?(\d+\.?\d*)/i);
      
      console.log('Del match:', delMatch);
      console.log('Ins match:', insMatch);
      
      if (delMatch && insMatch) {
        // Has sale price
        const delValue = parseFloat(delMatch[1]);
        const insValue = parseFloat(insMatch[1]);
        console.log('Del value:', delValue, 'Ins value:', insValue);
        if (!isNaN(delValue) && !isNaN(insValue)) {
          price = delValue;
          salePrice = insValue;
        }
      } else if (insMatch) {
        // Only ins, no del - this is the regular price (no sale)
        const insValue = parseFloat(insMatch[1]);
        if (!isNaN(insValue) && insValue > 0) {
          price = insValue;
        }
      } else {
        // No sale, just regular price - look for bdi directly
        const bdiMatch = priceBlock.match(/<bdi[^>]*>[\s\S]*?(\d+\.?\d*)/i);
        if (bdiMatch) {
          const value = parseFloat(bdiMatch[1]);
          if (!isNaN(value) && value > 0) {
            price = value;
          }
        }
      }
    }
  }
  
  return { price, salePrice };
}

const result = extractPrices(html, 'albanju');
console.log('\nResult:', result);

