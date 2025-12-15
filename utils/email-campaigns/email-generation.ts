/**
 * Shared utility functions for generating email HTML and text content
 * Extracted from app/api/email-campaigns/send/route.ts
 */

import { generateUnsubscribeUrl } from './unsubscribe-tokens';

/**
 * Generate HTML from email elements with tracking
 */
export function generateHtmlFromElements(
  elements: any[],
  subject: string,
  campaignId?: string,
  subscriberId?: string,
  sendId?: string,
  preheader?: string
): string {
  // Helper function to rewrite links for click tracking
  const rewriteLinksForTracking = (html: string): string => {
    if (!campaignId || !subscriberId || !sendId) {
      return html; // No tracking if missing parameters
    }

    // Find and replace all href attributes
    return html.replace(/href=["']([^"']+)["']/g, (match, url) => {
      // Skip already tracked URLs
      if (url.includes("/api/email-campaigns/track/click")) {
        return match;
      }

      // Skip internal tracking URLs
      if (url.includes("unsubscribe") || url.includes("mailto:")) {
        return match;
      }

      // Always use production URL for tracking (even in development)
      // because localhost URLs won't work in external email clients
      const baseUrl =
        process.env.NODE_ENV === "production"
          ? process.env.NEXT_PUBLIC_SITE_URL || "https://cymasphere.com"
          : "https://cymasphere.com";
      const trackingUrl = `${baseUrl}/api/email-campaigns/track/click?c=${campaignId}&u=${subscriberId}&s=${sendId}&url=${encodeURIComponent(
        url
      )}`;
      return `href="${trackingUrl}"`;
    });
  };

  // Resolve base URL for view-in-browser and other absolute links
  // In production, force cymasphere.com if env mistakenly points to localhost
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
  const resolvedBaseUrl = process.env.NODE_ENV === "production"
    ? (siteUrl && !siteUrl.includes("localhost") ? siteUrl : "https://cymasphere.com")
    : (siteUrl || "http://localhost:3000");

  const elementHtml = elements
    .map((element) => {
      // Debug logging to see element properties
      console.log('🎨 Generating HTML for element:', {
        id: element.id,
        type: element.type,
        fontFamily: element.fontFamily,
        fontSize: element.fontSize,
        textColor: element.textColor,
        backgroundColor: element.backgroundColor,
        paddingTop: element.paddingTop,
        paddingBottom: element.paddingBottom,
        paddingLeft: element.paddingLeft,
        paddingRight: element.paddingRight,
        fullWidth: element.fullWidth
      });
      
      const wrapperClass = element.fullWidth
        ? "full-width"
        : "constrained-width";

      // Compute per-side padding using nullish coalescing with sensible defaults
      const lrDefault = (() => {
        switch (element.type) {
          case "button":
          case "image":
            return 0;
          case "footer":
            return 0; // match visual editor (no side padding by default)
          case "brand-header":
            return 0; // brand header aligns edge-to-edge in editor
          default:
            return element.fullWidth ? 24 : 32;
        }
      })();

      const defaultTop = (() => {
        switch (element.type) {
          case "brand-header":
            return 0;
          case "footer":
            return 0; // footer defaults to 0 in editor
          default:
            return 16;
        }
      })();

      const defaultBottom = defaultTop;

      const paddingTop = (element.paddingTop ?? defaultTop) as number;
      const paddingBottom = (element.paddingBottom ?? defaultBottom) as number;
      const paddingLeft = (element.paddingLeft ?? lrDefault) as number;
      const paddingRight = (element.paddingRight ?? lrDefault) as number;
      // Use both inline style and table cell padding for maximum email client compatibility
      // Gmail often strips !important, so we use table cells as a fallback
      const paddingStyle = `padding: ${paddingTop}px ${paddingRight}px ${paddingBottom}px ${paddingLeft}px !important;`;
      const cellPaddingStyle = `padding: ${paddingTop}px ${paddingRight}px ${paddingBottom}px ${paddingLeft}px;`;

      switch (element.type) {
        case "header":
          return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse;">
            <tr>
              <td class="${wrapperClass}" style="${cellPaddingStyle}">
                <h1 style="font-size: ${element.fontSize || '2.5rem'}; color: ${element.textColor || '#333'}; margin: 0; text-align: ${element.textAlign || 'center'}; font-weight: ${element.fontWeight || '800'}; font-family: ${element.fontFamily || 'Arial, sans-serif'}; line-height: ${element.lineHeight || '1.2'}; padding: 0;">${element.content}</h1>
              </td>
            </tr>
          </table>`;

        case "text":
          return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse;">
            <tr>
              <td class="${wrapperClass}" style="${cellPaddingStyle}">
                <p style="font-size: ${element.fontSize || '1rem'}; color: ${element.textColor || '#555'}; line-height: ${element.lineHeight || '1.6'}; margin: 0; text-align: ${element.textAlign || 'left'}; font-weight: ${element.fontWeight || 'normal'}; font-family: ${element.fontFamily || 'Arial, sans-serif'}; padding: 0;">${element.content}</p>
              </td>
            </tr>
          </table>`;

        case "button":
          return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse;">
            <tr>
              <td class="${wrapperClass}" style="text-align: ${element.fullWidth ? 'left' : (element.textAlign || 'center')}; ${cellPaddingStyle}">
                <a href="${element.url || "#"}" style="display: ${element.fullWidth ? 'block' : 'inline-block'}; padding: ${element.fullWidth ? '1.25rem 2.5rem' : '1.25rem 2.5rem'}; background: ${element.gradient || element.backgroundColor || 'linear-gradient(135deg, #6c63ff 0%, #4ecdc4 100%)'}; color: ${element.textColor || 'white'}; text-decoration: none; border-radius: ${element.fullWidth ? '0' : '50px'}; font-weight: ${element.fontWeight || '700'}; font-size: ${element.fontSize || '1rem'}; font-family: ${element.fontFamily || 'Arial, sans-serif'}; line-height: ${element.lineHeight || '1.2'}; transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); text-transform: uppercase; letter-spacing: 1px; box-shadow: ${element.fullWidth ? 'none' : '0 8px 25px rgba(108, 99, 255, 0.3)'}; min-height: 1em; width: ${element.fullWidth ? '100%' : 'auto'}; text-align: ${element.textAlign || 'center'}; margin: 0;">${
            element.content
          }</a>
              </td>
            </tr>
          </table>`;

        case "image":
          return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse;">
            <tr>
              <td class="${wrapperClass}" style="text-align: ${element.textAlign || 'center'}; ${cellPaddingStyle}">
                <img src="${element.src}" alt="Campaign Image" style="max-width: 100%; height: auto; border-radius: ${
            element.fullWidth ? "0" : "8px"
          }; display: block; margin: 0;" />
              </td>
            </tr>
          </table>`;

        case "divider":
          return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse;">
            <tr>
              <td class="${wrapperClass}" style="text-align: ${element.textAlign || 'center'}; ${cellPaddingStyle}">
                <hr style="border: none; height: 2px; background: linear-gradient(90deg, #6c63ff, #4ecdc4); margin: 0;" />
              </td>
            </tr>
          </table>`;

        case "spacer":
          return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse;">
            <tr>
              <td class="${wrapperClass}" style="height: ${element.height || "20px"}; ${cellPaddingStyle} line-height: ${element.height || "20px"}; font-size: 1px;">&nbsp;</td>
            </tr>
          </table>`;

        case "footer":
          // Use Supabase storage icons for consistency with Visual Editor preview
          const iconMap: Record<string, string> = {
            facebook: 'https://jibirpbauzqhdiwjlrmf.supabase.co/storage/v1/object/public/email-assets/social-icons/fb.png',
            twitter: 'https://jibirpbauzqhdiwjlrmf.supabase.co/storage/v1/object/public/email-assets/social-icons/x.png',
            instagram: 'https://jibirpbauzqhdiwjlrmf.supabase.co/storage/v1/object/public/email-assets/social-icons/insta.png',
            youtube: 'https://jibirpbauzqhdiwjlrmf.supabase.co/storage/v1/object/public/email-assets/social-icons/youtube.png',
            discord: 'https://jibirpbauzqhdiwjlrmf.supabase.co/storage/v1/object/public/email-assets/social-icons/discord.png'
          };
          const socialLinksHtml = element.socialLinks && element.socialLinks.length > 0
            ? `<table role="presentation" align="center" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto;">
                 <tr>
                   ${element.socialLinks
                     .map((social: any) => {
                       const key = (social.platform || '').toLowerCase();
                       const iconUrl = iconMap[key];
                       if (!iconUrl) return '';
                       return `<td align="center" valign="middle" style="padding:0 8px;"><a href="${social.url}" style="text-decoration:none; display:inline-block; text-align:center; vertical-align:middle;"><img src="${iconUrl}" alt="${social.platform || 'Social'} icon" style="width:20px; height:20px; display:block; border:0;" /></a></td>`;
                     })
                     .join('')}
                 </tr>
               </table>`
            : "";

        // Footer font size should default to 0.8rem to match editor, but allow override
        const footerFontSize = element.fontSize || '0.8rem';
        return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse; background: ${element.backgroundColor || '#363636'}; border-top: ${element.fullWidth ? 'none' : '1px solid #dee2e6'};">
          <tr>
            <td style="font-size: ${footerFontSize}; color: ${element.textColor || '#ffffff'}; font-weight: ${element.fontWeight || 'normal'}; font-family: ${element.fontFamily || 'Arial, sans-serif'}; line-height: ${element.lineHeight || '1.4'}; ${cellPaddingStyle}">
              ${socialLinksHtml ? `<div style="margin-top: 24px; margin-bottom: 16px; text-align: center; font-size: ${footerFontSize};">${socialLinksHtml}</div>` : ""}
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding: 0 0 8px 0; text-align: center; color: ${element.textColor || '#ffffff'}; font-size: ${footerFontSize};">${element.footerText || `© ${new Date().getFullYear()} NNAud.io All rights reserved.`}</td>
                </tr>
              </table>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding: 0 0 24px 0; text-align: center; color: ${element.textColor || '#ffffff'}; font-size: ${footerFontSize};">
                    <a href="${(() => {
                      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://cymasphere.com';
                      const url = element.unsubscribeUrl && element.unsubscribeUrl.trim() ? element.unsubscribeUrl : `${baseUrl}/unsubscribe?email={{email}}`;
                      // Ensure URL is absolute
                      if (url.startsWith('/')) {
                        return `${baseUrl}${url}`;
                      }
                      if (!url.startsWith('http://') && !url.startsWith('https://')) {
                        return `${baseUrl}/${url}`;
                      }
                      return url;
                    })()}" style="color: ${element.textColor || '#ffffff'}; text-decoration: underline; font-size: ${footerFontSize}; cursor: pointer;">${element.unsubscribeText || "Unsubscribe"}</a>
                    &nbsp;|&nbsp;
                    <a href="${(() => {
                      const url = element.privacyUrl && element.privacyUrl.trim() ? element.privacyUrl : "https://cymasphere.com/privacy-policy";
                      if (url.startsWith('/')) {
                        return `${process.env.NEXT_PUBLIC_SITE_URL || 'https://cymasphere.com'}${url}`;
                      }
                      return url;
                    })()}" style="color: ${element.textColor || '#ffffff'}; text-decoration: underline; font-size: ${footerFontSize}; cursor: pointer;">${element.privacyText || "Privacy Policy"}</a>
                    &nbsp;|&nbsp;
                    <a href="${(() => {
                      const url = element.termsUrl && element.termsUrl.trim() ? element.termsUrl : "https://cymasphere.com/terms-of-service";
                      if (url.startsWith('/')) {
                        return `${process.env.NEXT_PUBLIC_SITE_URL || 'https://cymasphere.com'}${url}`;
                      }
                      return url;
                    })()}" style="color: ${element.textColor || '#ffffff'}; text-decoration: underline; font-size: ${footerFontSize}; cursor: pointer;">${element.termsText || "Terms of Service"}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>`;

        case "brand-header":
          // Use a more reliable image source and Gmail-compatible structure
          const logoUrl = "https://cymasphere.com/images/cm-logo.png";
          // Force brand header to align with content width
          const headerWrapperClass = "constrained-width";

          return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse; background: ${
            element.backgroundColor ||
            "linear-gradient(135deg, #1a1a1a 0%, #121212 100%)"
          };">
            <tr>
              <td class="${headerWrapperClass} brand-header" style="${cellPaddingStyle} text-align: center; min-height: 60px; vertical-align: middle;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse;">
                  <tr>
                    <td align="center" style="padding: 0;">
                      <img src="${logoUrl}" alt="Cymasphere Logo" style="max-width: 300px; width: 100%; height: auto; object-fit: contain; display: block; margin: 0 auto; padding: 0; border: 0; outline: none;" />
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>`;

        default:
          return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse;">
            <tr>
              <td class="${wrapperClass}" style="color: #555; text-align: ${element.textAlign || 'left'}; font-size: ${element.fontSize || '16px'}; font-weight: ${element.fontWeight || 'normal'}; font-family: ${element.fontFamily || 'Arial, sans-serif'}; line-height: ${element.lineHeight || '1.6'}; ${cellPaddingStyle}">
                ${element.content || ""}
              </td>
            </tr>
          </table>`;
      }
    })
    .join("");

  // Base HTML template with Gmail-compatible structure
  let html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subject}</title>
    
    <!-- Google Fonts for custom typography -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Open+Sans:wght@300;400;500;600;700;800&family=Roboto:wght@100;300;400;500;700;900&family=Lato:wght@100;300;400;700;900&family=Poppins:wght@100;200;300;400;500;600;700;800;900&family=Source+Sans+Pro:wght@200;300;400;600;700;900&family=Nunito:wght@200;300;400;500;600;700;800;900&family=Work+Sans:wght@100;200;300;400;500;600;700;800;900&family=Montserrat:wght@100;200;300;400;500;600;700;800;900&family=Merriweather:wght@300;400;700;900&family=Playfair+Display:wght@400;500;600;700;800;900&family=Oswald:wght@200;300;400;500;600;700&family=PT+Sans:wght@400;700&family=Ubuntu:wght@300;400;500;700&family=Noto+Sans:wght@100;200;300;400;500;600;700;800;900&family=Source+Code+Pro:wght@200;300;400;500;600;700;800;900&display=swap" rel="stylesheet">

    <style>
        /* Body styles moved to inline for email client compatibility */
        
        /* Ensure emojis render in color */
        * {
            -webkit-text-fill-color: initial;
            color: inherit;
        }
        
        /* Force emoji color rendering - multiple approaches */
        emoji, span[role="img"], .emoji {
            -webkit-text-fill-color: initial !important;
            color: initial !important;
        }
        
        /* Remove any filters that might be making emojis grey */
        * {
            filter: none !important;
        }
        
        /* Ensure text rendering is optimal for emojis */
        body {
            text-rendering: optimizeLegibility;
            -webkit-font-feature-settings: "liga" 1, "kern" 1;
            font-feature-settings: "liga" 1, "kern" 1;
        }
        
        /* Force emoji color rendering with higher specificity */
        p, div, span, h1, h2, h3, h4, h5, h6 {
            -webkit-text-fill-color: initial;
            color: inherit;
        }
        
        /* Brand header specific styling - ensure it's not affected by resets */
        .brand-header {
            color: inherit !important;
            -webkit-text-fill-color: inherit !important;
        }
        
        .brand-header span {
            color: inherit !important;
            -webkit-text-fill-color: inherit !important;
        }
        
        /* Ensure emojis are not affected by any color overrides */
        ::-webkit-text-fill-color {
            -webkit-text-fill-color: initial !important;
        }
        
        /* Reset any inherited CSS variables that might affect colors */
        :root {
            --text: initial !important;
            --text-secondary: initial !important;
            --primary: initial !important;
            --accent: initial !important;
        }
        
        /* Force emoji rendering with system emoji font */
        @font-face {
            font-family: 'Apple Color Emoji';
            src: local('Apple Color Emoji');
        }
        
        @font-face {
            font-family: 'Segoe UI Emoji';
            src: local('Segoe UI Emoji');
        }
        
        /* Apply emoji fonts to all text except brand header */
        *:not(.brand-header):not(.brand-header *) {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif !important;
        }
        
        /* Brand header specific styles - override the reset */
        .brand-header {
            font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
        }
        
        .brand-header .cyma-text {
            background: linear-gradient(90deg, #6c63ff, #4ecdc4) !important;
            -webkit-background-clip: text !important;
            -webkit-text-fill-color: transparent !important;
            background-clip: text !important;
            color: transparent !important;
        }
        
        .brand-header .sphere-text {
            color: #ffffff !important;
            -webkit-text-fill-color: #ffffff !important;
        }
        
        /* Container styles moved to inline for email client compatibility */
        
        .footer {
            padding: 20px;
            text-align: center;
            font-size: 12px;
            background-color: #f8f9fa;
            color: #666666;
            border-top: 1px solid #e9ecef;
        }
        
        .footer a {
            color: #6c63ff;
            text-decoration: none;
        }
        
        .full-width {
            width: 100%;
            margin: 0;
            border-radius: 0;
        }
        
        /* Override parent padding for full-width elements - but don't override top/bottom padding */
        .full-width {
            margin-left: -30px;
            margin-right: -30px;
            width: calc(100% + 60px);
        }
        
        /* Footer specific styling to span full width of white container */
        .footer-full-width {
            width: 100%;
            margin: 0;
            padding: 2rem;
            box-sizing: border-box;
        }
        
        .constrained-width {
            max-width: 600px;
            margin-left: auto;
            margin-right: auto;
            box-sizing: border-box;
        }
    </style>
</head>
<body style="margin: 0; padding: 20px; background-color: #f7f7f7; font-family: Arial, sans-serif; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
    <div style="background-color: #ffffff; max-width: 600px; margin: 0 auto; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);">
        <!-- Preheader Section -->
        <div style="padding: 15px 20px; background-color: #f8f9fa; border-bottom: 1px solid #e9ecef;">
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #666;">
                <div style="color: #333; font-weight: 500;">
                    ${preheader || 'Cymasphere - Your Music Production Journey'}
                </div>
                <div style="text-align: right; margin-left: auto;">
                    <a href="${resolvedBaseUrl}/email-preview?c=${campaignId || 'preview'}" style="color: #6c63ff; text-decoration: underline; font-weight: 500;">View in browser</a>
                </div>
            </div>
        </div>
        
        ${elementHtml}
    </div>
</body>
</html>`;

  // Add tracking pixel if we have tracking parameters
  if (campaignId && subscriberId && sendId) {
    // Always use production URL for tracking pixels (even in development)
    // because localhost URLs won't work in external email clients
    const baseUrl =
      process.env.NODE_ENV === "production"
        ? process.env.NEXT_PUBLIC_SITE_URL || "https://cymasphere.com"
        : "https://cymasphere.com";
    const trackingPixel = `
    <!-- Email Open Tracking -->
    <img src="${baseUrl}/api/email-campaigns/track/open?c=${campaignId}&u=${subscriberId}&s=${sendId}" width="1" height="1" style="display:block;border:0;margin:0;padding:0;" alt="" />`;

    html += trackingPixel;
  }

  html += `
</body>
</html>`;

  // Rewrite links for click tracking
  html = rewriteLinksForTracking(html);

  return html;
}

/**
 * Generate text content from email elements
 */
export function generateTextFromElements(elements: any[]): string {
  const textContent = elements
    .map((element) => {
      switch (element.type) {
        case "header":
          return `${element.content}\n${"=".repeat(element.content.length)}\n`;
        case "text":
          return `${element.content}\n`;
        case "button":
          return `${element.content}: ${element.url || "#"}\n`;
        case "image":
          return `[Image: ${element.src}]\n`;
        case "divider":
          return `${"─".repeat(50)}\n`;
        case "spacer":
          return "\n";
        case "footer":
          const socialText = element.socialLinks && element.socialLinks.length > 0
            ? element.socialLinks
                .map((social: any) => `${social.platform}: ${social.url}`)
                .join(" | ")
            : "";
          return `\n${"─".repeat(50)}\n${socialText ? socialText + "\n" : ""}${
            element.footerText || `© ${new Date().getFullYear()} NNAud.io All rights reserved.`
          }\n${element.unsubscribeText || "Unsubscribe"}: ${
            element.unsubscribeUrl || "#unsubscribe"
          } | ${element.privacyText || "Privacy Policy"}: ${
            element.privacyUrl || "#privacy"
          } | ${element.termsText || "Terms of Service"}: ${
            element.termsUrl || "https://cymasphere.com/terms-of-service"
          }\n`;
        case "brand-header":
          return `[LOGO] Cymasphere\n${"=".repeat(10)}\n`;
        default:
          return `${element.content || ""}\n`;
      }
    })
    .join("\n");

  return textContent.trim();
}

/**
 * Personalize content with subscriber data
 */
export function personalizeContent(content: string, subscriber: any): string {
  const metadata = subscriber.metadata || {};
  
  // Generate unsubscribe URL with token
  const unsubscribeUrl = generateUnsubscribeUrl(subscriber.email);
  const firstName =
    metadata.first_name ||
    subscriber.first_name ||
    subscriber.name?.split(" ")[0] ||
    "there";
  const lastName =
    metadata.last_name ||
    subscriber.last_name ||
    subscriber.name?.split(" ").slice(1).join(" ") ||
    "";
  const fullName =
    [firstName, lastName].filter(Boolean).join(" ") ||
    subscriber.name ||
    "there";

  // Encode email for URL usage
  const encodedEmail = encodeURIComponent(subscriber.email);
  
  let personalized = content
    .replace(/\{\{firstName\}\}/g, firstName)
    .replace(/\{\{lastName\}\}/g, lastName)
    .replace(/\{\{fullName\}\}/g, fullName)
    // Replace both unencoded and URL-encoded versions of {{email}}
    .replace(/\{\{email\}\}/g, subscriber.email)
    .replace(/%7B%7Bemail%7D%7D/g, encodedEmail)
    .replace(/\{\{subscription\}\}/g, metadata.subscription || "none");
  
  // Replace unsubscribe URLs with tokenized version (handle both {{email}} and URL-encoded)
  personalized = personalized.replace(
    /href=["']([^"']*\/unsubscribe[^"']*)\{\{email\}\}([^"']*)["']/g,
    () => `href="${unsubscribeUrl}"`
  );
  
  personalized = personalized.replace(
    /href=["']([^"']*\/unsubscribe[^"']*)%7B%7Bemail%7D%7D([^"']*)["']/g,
    () => `href="${unsubscribeUrl}"`
  );
  
  // Replace other {{email}} in href attributes (non-unsubscribe URLs)
  personalized = personalized.replace(
    /href=["']([^"']*)\{\{email\}\}([^"']*)["']/g,
    (match, before, after) => {
      return `href="${before}${encodedEmail}${after}"`;
    }
  );
  
  // Replace URL-encoded version in other href attributes
  personalized = personalized.replace(
    /href=["']([^"']*)%7B%7Bemail%7D%7D([^"']*)["']/g,
    (match, before, after) => {
      return `href="${before}${encodedEmail}${after}"`;
    }
  );
  
  return personalized
    .replace(
      /\{\{lifetimePurchase\}\}/g,
      metadata.lifetime_purchase || metadata.lifetimePurchase || "false"
    )
    .replace(
      /\{\{companyName\}\}/g,
      metadata.company_name || metadata.companyName || ""
    )
    .replace(
      /\{\{unsubscribeUrl\}\}/g,
      unsubscribeUrl
    )
    .replace(
      /\{\{currentDate\}\}/g,
      new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    );
}

