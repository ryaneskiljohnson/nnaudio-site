/**
 * Analytics Event Tracking Utilities
 * 
 * Provides helper functions for tracking custom events across different analytics platforms:
 * - Google Tag Manager / Google Analytics (via dataLayer)
 * - Meta Pixel (Facebook/Instagram)
 * 
 * Usage:
 *   import { trackEvent, trackPurchase, trackPageView } from '@/utils/analytics';
 * 
 *   trackEvent('button_click', { button_name: 'signup' });
 *   trackPurchase({ value: 99.99, currency: 'USD', items: [...] });
 */

declare global {
  interface Window {
    dataLayer?: any[];
    fbq?: (...args: any[]) => void;
  }
}

/**
 * Hash email with SHA-256 (client-side)
 * Normalizes email: lowercase, trim whitespace, then hash
 */
export async function hashEmail(email: string): Promise<string> {
  if (!email) return '';
  
  // Normalize: lowercase, trim whitespace
  const normalized = email.toLowerCase().trim();
  
  if (!normalized) return '';
  
  // Use Web Crypto API for SHA-256 hashing
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}

/**
 * Track a custom event to Google Analytics/GTM
 */
export function trackEvent(
  eventName: string,
  eventParams?: {
    event_category?: string;
    event_label?: string;
    value?: number;
    [key: string]: any;
  }
): void {
  if (typeof window === 'undefined') return;

  // Push to dataLayer for GTM/GA
  if (window.dataLayer) {
    window.dataLayer.push({
      event: eventName,
      ...eventParams,
    });
  }
}

/**
 * Track a page view
 */
export function trackPageView(url?: string): void {
  if (typeof window === 'undefined') return;

  const pagePath = url || window.location.pathname + window.location.search;

  // Track to GA/GTM
  if (window.dataLayer) {
    window.dataLayer.push({
      event: 'page_view',
      page_path: pagePath,
      page_title: document.title,
    });
  }

  // Track to Meta Pixel
  if (window.fbq) {
    window.fbq('track', 'PageView');
  }
}

/**
 * Track a purchase/conversion event
 */
export function trackPurchase(params: {
  value: number;
  currency?: string;
  transaction_id?: string;
  items?: Array<{
    item_id?: string;
    item_name?: string;
    category?: string;
    quantity?: number;
    price?: number;
  }>;
}): void {
  if (typeof window === 'undefined') return;

  const { value, currency = 'USD', transaction_id, items } = params;

  // Track to GA/GTM
  if (window.dataLayer) {
    window.dataLayer.push({
      event: 'purchase',
      value,
      currency,
      transaction_id,
      items,
    });
  }

  // Track to Meta Pixel
  if (window.fbq) {
    window.fbq('track', 'Purchase', {
      value,
      currency,
      content_ids: items?.map((item) => item.item_id),
      contents: items?.map((item) => ({
        id: item.item_id,
        quantity: item.quantity || 1,
        item_price: item.price,
      })),
    });
  }
}

/**
 * Track an "Add to Cart" event
 */
export function trackAddToCart(params: {
  value: number;
  currency?: string;
  items: Array<{
    item_id?: string;
    item_name?: string;
    category?: string;
    quantity?: number;
    price?: number;
  }>;
}): void {
  if (typeof window === 'undefined') return;

  const { value, currency = 'USD', items } = params;

  // Track to GA/GTM
  if (window.dataLayer) {
    window.dataLayer.push({
      event: 'add_to_cart',
      value,
      currency,
      items,
    });
  }

  // Track to Meta Pixel
  if (window.fbq) {
    window.fbq('track', 'AddToCart', {
      value,
      currency,
      content_ids: items.map((item) => item.item_id),
      contents: items.map((item) => ({
        id: item.item_id,
        quantity: item.quantity || 1,
        item_price: item.price,
      })),
    });
  }
}

/**
 * Track a "Sign Up" event
 */
export function trackSignUp(method?: string): void {
  if (typeof window === 'undefined') return;

  // Track to GA/GTM
  if (window.dataLayer) {
    window.dataLayer.push({
      event: 'sign_up',
      method: method || 'email',
    });
  }

  // Track to Meta Pixel
  if (window.fbq) {
    window.fbq('track', 'CompleteRegistration', {
      content_name: 'Sign Up',
      status: true,
    });
  }
}

/**
 * Track a "Lead" event (form submission, etc.)
 */
export function trackLead(params?: {
  content_name?: string;
  value?: number;
  currency?: string;
}): void {
  if (typeof window === 'undefined') return;

  // Track to GA/GTM
  if (window.dataLayer) {
    window.dataLayer.push({
      event: 'generate_lead',
      ...params,
    });
  }

  // Track to Meta Pixel
  if (window.fbq) {
    window.fbq('track', 'Lead', {
      content_name: params?.content_name || 'Lead',
      value: params?.value,
      currency: params?.currency || 'USD',
    });
  }
}

/**
 * Track a "View Content" event (product page, article, etc.)
 */
export function trackViewContent(params: {
  content_type?: string;
  content_ids?: string[];
  content_name?: string;
  value?: number;
  currency?: string;
}): void {
  if (typeof window === 'undefined') return;

  // Track to GA/GTM
  if (window.dataLayer) {
    window.dataLayer.push({
      event: 'view_item',
      ...params,
    });
  }

  // Track to Meta Pixel
  if (window.fbq) {
    window.fbq('track', 'ViewContent', {
      content_type: params.content_type || 'product',
      content_ids: params.content_ids,
      content_name: params.content_name,
      value: params.value,
      currency: params.currency || 'USD',
    });
  }
}

/**
 * Track a "Search" event
 */
export function trackSearch(searchTerm: string): void {
  if (typeof window === 'undefined') return;

  // Track to GA/GTM
  if (window.dataLayer) {
    window.dataLayer.push({
      event: 'search',
      search_term: searchTerm,
    });
  }

  // Track to Meta Pixel
  if (window.fbq) {
    window.fbq('track', 'Search', {
      search_string: searchTerm,
    });
  }
}

/**
 * Track "Initiate Checkout" (user started checkout flow).
 * Fire when user clicks "Proceed to checkout" or when checkout page loads.
 *
 * @param params - value, currency, optional content_ids and num_items
 */
export function trackInitiateCheckout(params: {
  value: number;
  currency?: string;
  content_ids?: string[];
  num_items?: number;
}): void {
  if (typeof window === 'undefined') return;

  const { value, currency = 'USD', content_ids, num_items } = params;

  if (window.dataLayer) {
    window.dataLayer.push({
      event: 'begin_checkout',
      value,
      currency,
      content_ids,
      num_items,
    });
  }

  if (window.fbq) {
    window.fbq('track', 'InitiateCheckout', {
      value,
      currency,
      content_ids,
      num_items,
    });
  }
}

/**
 * Track custom Meta Pixel events
 */
export function trackMetaEvent(eventName: string, params?: Record<string, any>): void {
  if (typeof window === 'undefined' || !window.fbq) return;
  window.fbq('track', eventName, params);
}

/**
 * Track custom GA/GTM events
 */
export function trackGAEvent(eventName: string, params?: Record<string, any>): void {
  if (typeof window === 'undefined' || !window.dataLayer) return;
  window.dataLayer.push({
    event: eventName,
    ...params,
  });
}

/**
 * Push user data to dataLayer for advanced tracking
 * This allows Meta and other platforms to connect events across sessions
 * 
 * Usage:
 *   await trackUserData({
 *     user_id: '12345',
 *     email: 'user@example.com'
 *   });
 */
export async function trackUserData(data: {
  user_id: string;
  email: string;
}): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    const email_sha256 = await hashEmail(data.email);
    
    if (window.dataLayer) {
      window.dataLayer.push({
        event: 'user_data',
        user: {
          user_id: data.user_id,
          email_sha256: email_sha256,
        },
      });
    }
  } catch (error) {
    console.error('Error tracking user data:', error);
  }
}

/**
 * Send event to Meta Conversions API (server-side)
 * This provides reliable tracking even with ad blockers and privacy features
 * 
 * Usage:
 *   await trackMetaConversion('Purchase', {
 *     email: 'user@example.com',
 *     value: 99.99,
 *     currency: 'USD'
 *   });
 */
export async function trackMetaConversion(
  eventName: string,
  data: {
    email?: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
    userId?: string;
    value?: number;
    currency?: string;
    contentIds?: string[];
    numItems?: number;
    transactionId?: string;
    customData?: Record<string, any>;
    testEventCode?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  if (typeof window === 'undefined') {
    console.warn('trackMetaConversion called on server');
    return { success: false, error: 'Cannot call from server' };
  }

  try {
    // Get client IP and user agent (server will overwrite with real values)
    const userAgent = navigator.userAgent;

    // Get FBP cookie if available
    let fbpId: string | undefined;
    if (typeof document !== 'undefined') {
      const fbpMatch = document.cookie.match(/(_fbp=fb\.\d+\.\d+)/);
      fbpId = fbpMatch ? fbpMatch[1] : undefined;
    }

    const payload = {
      eventName,
      userData: {
        email: data.email,
        phone: data.phone,
        firstName: data.firstName,
        lastName: data.lastName,
        city: data.city,
        state: data.state,
        zip: data.zip,
        country: data.country,
        userId: data.userId,
        clientUserAgent: userAgent,
        fbpId,
      },
      customData: {
        ...(data.value && { value: data.value }),
        ...(data.currency && { currency: data.currency }),
        ...(data.contentIds && { content_ids: data.contentIds }),
        ...(data.numItems && { num_items: data.numItems }),
        ...data.customData,
      },
      ...(data.transactionId && { eventId: data.transactionId }),
      ...(data.testEventCode && { testEventCode: data.testEventCode }),
      url: window.location.href,
    };

    console.log('📤 Sending Meta conversion event:', eventName);

    const response = await fetch('/api/meta/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Meta conversion API error:', error);
      return {
        success: false,
        error: error.error || 'Failed to send conversion event',
      };
    }

    const result = await response.json();
    console.log('✅ Meta conversion event sent successfully');
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Error sending Meta conversion event:', errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Deduplication utility to prevent events from firing multiple times
 * Uses sessionStorage to track fired events per page/session
 * 
 * @param eventName - The event name to check/fire
 * @param eventId - Optional unique event ID (e.g., session_id, transaction_id)
 * @returns true if event should fire, false if already fired
 */
export function shouldFireEvent(eventName: string, eventId?: string): boolean {
  if (typeof window === 'undefined') return false;
  
  const storageKey = `event_fired_${eventName}${eventId ? `_${eventId}` : ''}`;
  
  // Check if event was already fired in this session
  const alreadyFired = sessionStorage.getItem(storageKey);
  
  if (alreadyFired) {
    console.log(`⏭️ Event ${eventName} already fired, skipping (deduplication)`);
    return false;
  }
  
  // Mark as fired
  sessionStorage.setItem(storageKey, 'true');
  return true;
}

/**
 * Track event with deduplication and event ID
 * Prevents the same event from firing multiple times on page refresh/navigation
 * 
 * @param eventName - Event name (e.g., 'registration_success', 'subscription_success', 'purchase')
 * @param eventData - Event data to push to dataLayer
 * @param eventId - Unique event ID for deduplication (e.g., session_id, transaction_id)
 * @returns Promise that resolves when event is tracked
 */
export async function trackEventOnce(
  eventName: string,
  eventData: Record<string, any> = {},
  eventId?: string
): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  
  // Check deduplication
  if (!shouldFireEvent(eventName, eventId)) {
    return false;
  }
  
  window.dataLayer = window.dataLayer || [];
  
  // Add event ID to event data for Meta deduplication
  const eventPayload = {
    event: eventName,
    event_id: eventId || `${eventName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    ...eventData,
  };
  
  window.dataLayer.push(eventPayload);
  console.log(`✅ Tracked ${eventName} with deduplication`, eventPayload);
  
  return true;
}

