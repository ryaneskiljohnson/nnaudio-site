/**
 * Cleans HTML entities and tags from text
 * Converts HTML entities like &amp; to &, &#8217; to ', etc.
 * Removes HTML tags
 */
export function cleanHtmlText(text: string | null | undefined): string {
  if (!text) return '';
  
  // Create a temporary DOM element to decode HTML entities
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = text;
  let cleaned = tempDiv.textContent || tempDiv.innerText || '';
  
  // Remove any remaining HTML tags (in case some weren't properly closed)
  cleaned = cleaned.replace(/<[^>]*>/g, '');
  
  // Clean up common HTML entities that might remain
  cleaned = cleaned
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#8217;/g, "'")
    .replace(/&#8211;/g, '–')
    .replace(/&#8212;/g, '—')
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8230;/g, '...')
    .replace(/&nbsp;/g, ' ')
    .replace(/&apos;/g, "'");
  
  // Clean up multiple spaces and trim
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  return cleaned;
}

/**
 * Server-side version that doesn't use DOM APIs
 */
export function cleanHtmlTextServer(text: string | null | undefined): string {
  if (!text) return '';
  
  let cleaned = text;
  
  // Remove HTML tags
  cleaned = cleaned.replace(/<[^>]*>/g, '');
  
  // Decode HTML entities
  cleaned = cleaned
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#8217;/g, "'")
    .replace(/&#8211;/g, '–')
    .replace(/&#8212;/g, '—')
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8230;/g, '...')
    .replace(/&nbsp;/g, ' ')
    .replace(/&apos;/g, "'")
    // Handle numeric entities
    .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (match, hex) => String.fromCharCode(parseInt(hex, 16)));
  
  // Clean up multiple spaces and trim
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  return cleaned;
}

