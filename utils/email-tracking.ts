/**
 * Email tracking utilities for injecting tracking pixels and rewriting links
 */

/**
 * Known bot/automated user agents based on 2024 industry best practices
 * Only includes very specific bot patterns that are definitely automated
 */
const BOT_USER_AGENTS = [
  // Explicit bot identifiers
  'googlebot',
  'bingbot',
  'slurp',
  'facebookexternalhit',
  'twitterbot',
  'linkedinbot',
  'whatsapp',
  'telegrambot',
  
  // Email security scanners (corporate/enterprise)
  'proofpoint',
  'mimecast',
  'forcepoint',
  'symantec',
  'mcafee',
  'cisco ironport',
  'barracuda',
  'sophos',
  'trend micro',
  
  // Development/testing tools
  'curl/',
  'wget/',
  'postman',
  'insomnia',
  'httpie',
  'python-requests',
  'go-http-client',
  
  // Very old browsers (definitely automated/headless)
  'Chrome/38.',
  'Chrome/39.',
  'Chrome/40.',
  'Chrome/41.',
  'Chrome/42.',
  
  // Explicit test patterns
  'test-',
  'debug-',
  'bot-',
  'scanner-',
  'manual-test'
];

/**
 * Suspicious IP patterns - ONLY obvious localhost/development IPs
 * Note: Private network ranges (192.168.x.x, 10.x.x.x) are NOT included
 * because these are legitimate IPs used by home and office networks
 */
const SUSPICIOUS_IPS = [
  '127.0.0.1',           // IPv4 loopback
  '::1',                 // IPv6 loopback
  '::ffff:127.0.0.1',   // IPv4-mapped IPv6 loopback
  'localhost',           // Literal localhost
  'DEV-TEST:'           // Development test patterns
];

/**
 * Determines if an email open is likely from a bot or automated system
 * Uses 2024 industry best practices for bot detection
 * @param userAgent - The user agent string
 * @param ipAddress - The IP address  
 * @returns true if likely automated, false if likely human
 */
export function isLikelyBotOpen(
  userAgent: string | null,
  ipAddress: string | null
): boolean {
  // Check user agent for specific bot patterns
  if (userAgent) {
    const ua = userAgent.toLowerCase();
    for (const botPattern of BOT_USER_AGENTS) {
      if (ua.includes(botPattern.toLowerCase())) {
        console.log(`🤖 Bot pattern matched: "${botPattern}" in "${ua.slice(0, 100)}"`);
        return true;
      }
    }
  }

  // Check IP address for obvious development/testing patterns  
  if (ipAddress) {
    for (const suspiciousIp of SUSPICIOUS_IPS) {
      if (ipAddress.includes(suspiciousIp)) {
        console.log(`🚨 Suspicious IP matched: "${suspiciousIp}" in "${ipAddress}"`);
        return true;
      }
    }
  }

  return false;
}

/**
 * Determines if an email client is known to prefetch images aggressively
 * NOTE: Prefetching is NOT the same as being a bot - prefetchers are legitimate email clients
 * This function is for informational purposes, not for blocking opens
 * @param userAgent - The user agent string
 * @returns true if known prefetcher (but should still count as legitimate opens)
 */
export function isKnownPrefetcher(userAgent: string | null): boolean {
  if (!userAgent) return false;
  
  const ua = userAgent.toLowerCase();
  
  // Apple Mail Privacy Protection (prefetches all images)
  if (ua.includes('applecoremail') || ua.includes('mail/')) {
    return true;
  }
  
  // Some corporate email clients that prefetch for security scanning
  if (ua.includes('outlook') && ua.includes('safelinks')) {
    return true;
  }
  
  // Gmail prefetching is normal user behavior - don't treat as suspicious
  return false;
}

/**
 * Generates email tracking pixel URL
 * @param campaignId - Campaign ID
 * @param subscriberId - Subscriber ID  
 * @param sendId - Unique send record ID
 * @param baseUrl - Base URL for tracking
 * @returns Complete tracking pixel URL
 */
export function generateTrackingPixelUrl(
  campaignId: string,
  subscriberId: string,
  sendId: string,
  baseUrl: string = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
): string {
  return `${baseUrl}/api/email-campaigns/track/open?c=${campaignId}&u=${subscriberId}&s=${sendId}`;
}

/**
 * Generates click tracking URL
 * @param targetUrl - Original URL to redirect to
 * @param campaignId - Campaign ID
 * @param subscriberId - Subscriber ID
 * @param sendId - Unique send record ID
 * @param baseUrl - Base URL for tracking
 * @returns Complete click tracking URL
 */
export function generateClickTrackingUrl(
  targetUrl: string,
  campaignId: string,
  subscriberId: string,
  sendId: string,
  baseUrl: string = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
): string {
  const encodedUrl = encodeURIComponent(targetUrl);
  return `${baseUrl}/api/email-campaigns/track/click?c=${campaignId}&u=${subscriberId}&s=${sendId}&url=${encodedUrl}`;
}

/**
 * Replaces all links in HTML content with click tracking URLs
 * @param htmlContent - Original HTML content
 * @param campaignId - Campaign ID
 * @param subscriberId - Subscriber ID
 * @param sendId - Unique send record ID
 * @param baseUrl - Base URL for tracking
 * @returns HTML with tracking URLs
 */
export function injectClickTracking(
  htmlContent: string,
  campaignId: string,
  subscriberId: string,
  sendId: string,
  baseUrl?: string
): string {
  // Regex to find all href attributes
  const hrefRegex = /href=["']([^"']+)["']/g;
  
  return htmlContent.replace(hrefRegex, (match, originalUrl) => {
    // Skip if already a tracking URL or relative/anchor link
    if (originalUrl.startsWith('#') || 
        originalUrl.startsWith('mailto:') || 
        originalUrl.startsWith('tel:') ||
        originalUrl.includes('/api/email-campaigns/track/')) {
      return match;
    }
    
    const trackingUrl = generateClickTrackingUrl(originalUrl, campaignId, subscriberId, sendId, baseUrl);
    return `href="${trackingUrl}"`;
  });
}

/**
 * Injects tracking pixel into HTML email content
 * @param htmlContent - Original HTML content
 * @param campaignId - Campaign ID
 * @param subscriberId - Subscriber ID
 * @param sendId - Unique send record ID
 * @param baseUrl - Base URL for tracking
 * @returns HTML with tracking pixel
 */
export function injectOpenTracking(
  htmlContent: string,
  campaignId: string,
  subscriberId: string,
  sendId: string,
  baseUrl?: string
): string {
  const trackingPixelUrl = generateTrackingPixelUrl(campaignId, subscriberId, sendId, baseUrl);
  const trackingPixel = `<img src="${trackingPixelUrl}" width="1" height="1" style="display:block;border:0;margin:0;padding:0;" alt="" />`;
  
  // Try to insert before closing body tag, otherwise append to end
  if (htmlContent.includes('</body>')) {
    return htmlContent.replace('</body>', `${trackingPixel}</body>`);
  } else {
    return htmlContent + trackingPixel;
  }
}

/**
 * Adds both open and click tracking to HTML email content
 * @param htmlContent - Original HTML content
 * @param campaignId - Campaign ID
 * @param subscriberId - Subscriber ID
 * @param sendId - Unique send record ID
 * @param baseUrl - Base URL for tracking
 * @returns Fully tracked HTML content
 */
export function addEmailTracking(
  htmlContent: string,
  campaignId: string,
  subscriberId: string,
  sendId: string,
  baseUrl?: string
): string {
  let trackedContent = htmlContent;
  
  // Add click tracking first
  trackedContent = injectClickTracking(trackedContent, campaignId, subscriberId, sendId, baseUrl);
  
  // Then add open tracking
  trackedContent = injectOpenTracking(trackedContent, campaignId, subscriberId, sendId, baseUrl);
  
  return trackedContent;
}

/**
 * Inject tracking pixel and rewrite links in HTML content
 */
export function injectEmailTracking(
  htmlContent: string, 
  campaignId: string, 
  subscriberId: string, 
  sendId: string
): string {
  console.log('🔧 Injecting email tracking:', { campaignId, subscriberId, sendId });

  if (!campaignId || !subscriberId || !sendId) {
    console.log('⚠️ Missing tracking parameters, returning original content');
    return htmlContent; // Return original content if tracking parameters missing
  }

  // Always use production URL for tracking pixels (even in development)
  // because localhost URLs won't work in external email clients
  const baseUrl = process.env.NODE_ENV === 'production' 
    ? (process.env.NEXT_PUBLIC_SITE_URL || 'https://nnaud.io')
    : 'https://nnaud.io';
  console.log('🔧 Using base URL:', baseUrl);

  // Step 1: Rewrite links for click tracking
  let trackedHtml = rewriteLinksForTracking(htmlContent, campaignId, subscriberId, sendId, baseUrl);

  // Step 2: Add tracking pixel
  const trackingPixel = `
    <!-- Email Open Tracking -->
    <img src="${baseUrl}/api/email-campaigns/track/open?c=${campaignId}&u=${subscriberId}&s=${sendId}" width="1" height="1" style="display:block;border:0;margin:0;padding:0;" alt="" />`;

  console.log('📧 Generated tracking pixel:', trackingPixel.trim());

  // Try to insert before closing body tag, fallback to append
  if (trackedHtml.includes('</body>')) {
    trackedHtml = trackedHtml.replace('</body>', `${trackingPixel}\n</body>`);
    console.log('✅ Tracking pixel inserted before </body>');
  } else {
    trackedHtml += trackingPixel;
    console.log('✅ Tracking pixel appended to end of HTML');
  }

  // Log a sample of the final HTML to verify tracking was added
  const htmlSample = trackedHtml.slice(-500); // Last 500 characters
  console.log('📧 Final HTML sample (last 500 chars):', htmlSample);

  return trackedHtml;
}

/**
 * Rewrite all links in HTML for click tracking
 */
function rewriteLinksForTracking(
  html: string, 
  campaignId: string, 
  subscriberId: string, 
  sendId: string,
  baseUrl: string
): string {
  // Find and replace all href attributes
  return html.replace(/href=["']([^"']+)["']/g, (match, url) => {
    // Skip already tracked URLs
    if (url.includes('/api/email-campaigns/track/click')) {
      return match;
    }
    
    // Skip internal tracking URLs and special links
    if (url.includes('unsubscribe') || url.includes('mailto:') || url.startsWith('#')) {
      return match;
    }
    
    // Create tracking URL
    const trackingUrl = `${baseUrl}/api/email-campaigns/track/click?c=${campaignId}&u=${subscriberId}&s=${sendId}&url=${encodeURIComponent(url)}`;
    return `href="${trackingUrl}"`;
  });
}

/**
 * Create a unique send record for tracking
 */
export async function createSendRecord(
  campaignId: string, 
  subscriberId: string, 
  recipientEmail: string,
  supabase: any
): Promise<string | null> {
  try {
    console.log('📝 Creating send record:', { campaignId, subscriberId, recipientEmail });

    const sendRecord = {
      campaign_id: campaignId,
      subscriber_id: subscriberId,
      email: recipientEmail,
      sent_at: new Date().toISOString(),
      status: 'sent'
    };

    console.log('📝 Send record data:', sendRecord);

    const { data, error } = await supabase
      .from('email_sends')
      .insert(sendRecord)
      .select('id')
      .single();

    if (error) {
      console.error('❌ Error creating send record:', {
        error: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      
      // Try to continue without send record for now
      console.log('⚠️ Continuing without send record - using fallback ID');
      return `fallback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    console.log('✅ Send record created successfully:', data.id);
    return data.id;
  } catch (error) {
    console.error('❌ Exception creating send record:', error);
    
    // Return a fallback ID so tracking can still work
    const fallbackId = `fallback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    console.log('⚠️ Using fallback send ID:', fallbackId);
    return fallbackId;
  }
} 