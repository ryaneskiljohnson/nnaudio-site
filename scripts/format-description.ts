/**
 * @fileoverview Description formatter and cleaner for product descriptions
 * @module scripts/format-description
 * 
 * This script cleans HTML entities, removes extra whitespace, and formats
 * descriptions to target lengths (short: 1-2 paragraphs, full: 2-3 paragraphs).
 */

/**
 * @brief Formatted description structure
 */
export interface FormattedDescriptions {
  short: string;
  full: string;
  cleaned: boolean;
  originalShortLength: number;
  originalFullLength: number;
}

/**
 * @brief HTML entity mapping for common entities
 */
const HTML_ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#34;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&#8211;': '–', // en dash
  '&#8212;': '—', // em dash
  '&#8216;': '\u2018', // left single quote
  '&#8217;': '\u2019', // right single quote
  '&#8220;': '\u201C', // left double quote
  '&#8221;': '\u201D', // right double quote
  '&#8230;': '…', // ellipsis
  '&nbsp;': ' ',
  '&ndash;': '–',
  '&mdash;': '—',
  '&lsquo;': '\u2018',
  '&rsquo;': '\u2019',
  '&ldquo;': '\u201C',
  '&rdquo;': '\u201D',
  '&hellip;': '…',
};

/**
 * @brief Cleans HTML entities from text
 * @param text Text containing HTML entities
 * @returns Clean text with entities replaced
 * 
 * @example
 * cleanHtmlEntities("Apple &amp; Orange") // returns "Apple & Orange"
 * cleanHtmlEntities("It&#8217;s great!") // returns "It's great!"
 */
export function cleanHtmlEntities(text: string): string {
  let cleaned = text;
  
  // Replace known entities
  for (const [entity, replacement] of Object.entries(HTML_ENTITIES)) {
    cleaned = cleaned.replace(new RegExp(entity, 'g'), replacement);
  }
  
  // Replace numeric entities (&#123; format)
  cleaned = cleaned.replace(/&#(\d+);/g, (match, dec) => {
    return String.fromCharCode(parseInt(dec, 10));
  });
  
  // Replace hex entities (&#x1A2; format)
  cleaned = cleaned.replace(/&#x([0-9a-fA-F]+);/g, (match, hex) => {
    return String.fromCharCode(parseInt(hex, 16));
  });
  
  return cleaned;
}

/**
 * @brief Removes extra whitespace and normalizes line breaks
 * @param text Text to clean
 * @returns Cleaned text
 */
export function normalizeWhitespace(text: string): string {
  return text
    .replace(/\r\n/g, '\n') // Normalize line endings
    .replace(/\r/g, '\n')
    .replace(/\t/g, ' ') // Replace tabs with spaces
    .replace(/ +/g, ' ') // Multiple spaces to single space
    .replace(/\n\n\n+/g, '\n\n') // Max 2 consecutive line breaks
    .trim();
}

/**
 * @brief Splits text into sentences
 * @param text Text to split
 * @returns Array of sentences
 */
function splitIntoSentences(text: string): string[] {
  // Split on period, exclamation, or question mark followed by space/newline
  return text
    .split(/([.!?]+[\s\n]+)/)
    .reduce((acc: string[], part, i, arr) => {
      if (i % 2 === 0 && part.trim()) {
        const nextPart = arr[i + 1] || '';
        acc.push((part + nextPart).trim());
      }
      return acc;
    }, [])
    .filter(s => s.length > 0);
}

/**
 * @brief Formats text into paragraphs of target length
 * @param sentences Array of sentences
 * @param targetParagraphs Number of target paragraphs (1-2 or 2-3)
 * @param minChars Minimum characters per paragraph
 * @param maxChars Maximum total characters
 * @returns Formatted text with paragraphs
 */
function formatIntoParagraphs(
  sentences: string[],
  targetParagraphs: number,
  minChars: number,
  maxChars: number
): string {
  if (sentences.length === 0) return '';
  
  const paragraphs: string[] = [];
  let currentParagraph: string[] = [];
  let currentLength = 0;
  
  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    const sentenceLength = sentence.length;
    
    // Check if adding this sentence would exceed max chars
    if (currentLength + sentenceLength > maxChars && paragraphs.length > 0) {
      break;
    }
    
    currentParagraph.push(sentence);
    currentLength += sentenceLength;
    
    // Start a new paragraph if:
    // 1. Current paragraph is long enough (> minChars)
    // 2. We haven't reached target paragraphs yet
    // 3. There are more sentences to process
    if (
      currentParagraph.join(' ').length >= minChars &&
      paragraphs.length < targetParagraphs - 1 &&
      i < sentences.length - 1
    ) {
      paragraphs.push(currentParagraph.join(' '));
      currentParagraph = [];
    }
  }
  
  // Add remaining sentences as final paragraph
  if (currentParagraph.length > 0) {
    paragraphs.push(currentParagraph.join(' '));
  }
  
  return paragraphs.join('\n\n');
}

/**
 * @brief Formats short description (1-2 paragraphs, ~100-250 chars)
 * @param text Raw description text
 * @returns Formatted short description
 */
export function formatShortDescription(text: string): string {
  if (!text || text.trim().length === 0) return '';
  
  const cleaned = normalizeWhitespace(cleanHtmlEntities(text));
  const sentences = splitIntoSentences(cleaned);
  
  // Target: 1-2 paragraphs, 100-250 characters
  const formatted = formatIntoParagraphs(sentences, 2, 50, 250);
  
  return formatted;
}

/**
 * @brief Formats full description (2-3 paragraphs, ~300-600 chars)
 * @param text Raw description text
 * @returns Formatted full description
 */
export function formatFullDescription(text: string): string {
  if (!text || text.trim().length === 0) return '';
  
  const cleaned = normalizeWhitespace(cleanHtmlEntities(text));
  const sentences = splitIntoSentences(cleaned);
  
  // Target: 2-3 paragraphs, 300-600 characters
  const formatted = formatIntoParagraphs(sentences, 3, 100, 600);
  
  return formatted;
}

/**
 * @brief Formats both short and full descriptions
 * @param shortText Raw short description
 * @param fullText Raw full description
 * @returns FormattedDescriptions object with both formatted descriptions
 * 
 * @example
 * const result = formatDescriptions(rawShort, rawFull);
 * console.log(result.short); // Formatted short description
 * console.log(result.full);  // Formatted full description
 */
export function formatDescriptions(
  shortText: string,
  fullText: string
): FormattedDescriptions {
  const originalShortLength = shortText?.length || 0;
  const originalFullLength = fullText?.length || 0;
  
  let formattedShort = formatShortDescription(shortText);
  let formattedFull = formatFullDescription(fullText);
  
  // If short description is empty but we have full, create short from full
  if (!formattedShort && formattedFull) {
    const sentences = splitIntoSentences(formattedFull);
    formattedShort = formatIntoParagraphs(sentences, 1, 50, 200);
  }
  
  // If full description is empty but we have short, use short as base
  if (!formattedFull && formattedShort) {
    formattedFull = formattedShort;
  }
  
  const cleaned = (
    (formattedShort !== shortText) ||
    (formattedFull !== fullText)
  );
  
  return {
    short: formattedShort,
    full: formattedFull,
    cleaned,
    originalShortLength,
    originalFullLength
  };
}

/**
 * @brief Main function for CLI testing
 */
async function main() {
  const testShort = "This plugin captures the essence &amp; soul of vintage gaming.";
  const testFull = `Want MIDI? No Problem!\n\nThis pack is busting at the seams with over 300 MIDI Loops! Within you will find 100 Chord Progressions, 100 Corresponding Melodies &amp; 100+ Drum, Bass &amp; Percussion Loops. Simply Drag &amp; Drop any MIDI clip to instantly begin creating! It&#8217;s never been easier to find the inspiration you&#8217;ve been searching for to create your next HIT!`;
  
  console.log('Testing description formatter...\n');
  console.log('Input Short:', testShort);
  console.log('Input Full:', testFull.substring(0, 100) + '...\n');
  
  const result = formatDescriptions(testShort, testFull);
  
  console.log('Output Short:', result.short);
  console.log('\nOutput Full:', result.full);
  console.log('\nStats:');
  console.log(`  Short: ${result.originalShortLength} → ${result.short.length} chars`);
  console.log(`  Full: ${result.originalFullLength} → ${result.full.length} chars`);
  console.log(`  Cleaned: ${result.cleaned}`);
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}
