/**
 * Meta Conversions API Utilities
 * 
 * Server-side implementation of Meta Conversions API for more reliable conversion tracking.
 * This complements the pixel and works even with ad blockers and browser privacy features.
 * 
 * Docs: https://developers.facebook.com/docs/marketing-api/conversions-api/get-started
 */

import crypto from 'crypto';

// Type definitions for Meta Conversions API
export interface MetaUserData {
  em?: string; // Email (hashed)
  ph?: string; // Phone (hashed)
  fn?: string; // First name (hashed)
  ln?: string; // Last name (hashed)
  ct?: string; // City (hashed)
  st?: string; // State (hashed)
  zp?: string; // Zip code (hashed)
  country?: string; // Country code (2 letters)
  external_id?: string; // Your internal user ID
  client_ip_address?: string; // User's IP address
  client_user_agent?: string; // User's browser UA
  fbc?: string; // Facebook click ID
  fbp?: string; // Facebook browser ID (from fbq)
}

export interface MetaCustomData {
  value?: number;
  currency?: string;
  content_name?: string;
  content_type?: string;
  content_ids?: string[];
  num_items?: number;
  status?: string;
  [key: string]: any;
}

export interface MetaEvent {
  event_name: string;
  event_time: number; // Unix timestamp
  event_id?: string; // Deduplication ID
  event_source_url?: string;
  action_source?: 'website' | 'app' | 'phone_call' | 'chat' | 'physical_store' | 'system_generated' | 'other';
  user_data: MetaUserData;
  custom_data?: MetaCustomData;
  opt_out?: boolean;
}

/**
 * Hash PII data for Meta Conversions API
 * Meta requires SHA-256 hashing of personally identifiable information
 */
function hashPII(value: string | undefined): string | undefined {
  if (!value) return undefined;
  
  // Normalize: lowercase, trim whitespace
  const normalized = value.toString().toLowerCase().trim();
  
  if (!normalized) return undefined;
  
  // SHA-256 hash
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

/**
 * Hash phone number for Meta
 * Remove all non-digits except leading +
 */
function hashPhone(phone: string | undefined): string | undefined {
  if (!phone) return undefined;
  
  // Remove non-digits (keep + at start if present)
  let normalized = phone.replace(/\D/g, '');
  
  // Remove country code (keep 10+ digit numbers, or if starts with 1 for US)
  if (normalized.startsWith('1') && normalized.length > 10) {
    normalized = normalized.slice(1);
  }
  
  if (!normalized) return undefined;
  
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

/**
 * Normalize user data for Meta Conversions API
 * Hashes all PII and validates data format
 */
export function normalizeMetaUserData(rawData: {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  userId?: string;
  clientIp?: string;
  clientUserAgent?: string;
  fbcId?: string;
  fbpId?: string;
}): MetaUserData {
  return {
    em: hashPII(rawData.email),
    ph: hashPhone(rawData.phone),
    fn: hashPII(rawData.firstName),
    ln: hashPII(rawData.lastName),
    ct: hashPII(rawData.city),
    st: hashPII(rawData.state),
    zp: hashPII(rawData.zip),
    country: rawData.country?.length === 2 ? rawData.country.toLowerCase() : undefined,
    external_id: hashPII(rawData.userId),
    client_ip_address: rawData.clientIp,
    client_user_agent: rawData.clientUserAgent,
    fbc: rawData.fbcId,
    fbp: rawData.fbpId,
  };
}

/**
 * Build a Meta Conversions API event
 */
export function buildMetaEvent(
  eventName: string,
  userData: MetaUserData,
  customData?: MetaCustomData,
  options?: {
    eventId?: string;
    eventSourceUrl?: string;
    timestamp?: number;
    optOut?: boolean;
  }
): MetaEvent {
  return {
    event_name: eventName,
    event_time: options?.timestamp || Math.floor(Date.now() / 1000),
    event_id: options?.eventId,
    event_source_url: options?.eventSourceUrl,
    action_source: 'website',
    user_data: userData,
    custom_data: customData,
    opt_out: options?.optOut,
  };
}

/**
 * Standard Meta event names (recommended)
 */
export const META_EVENT_NAMES = {
  PAGE_VIEW: 'PageView',
  VIEW_CONTENT: 'ViewContent',
  SEARCH: 'Search',
  ADD_TO_CART: 'AddToCart',
  ADD_TO_WISHLIST: 'AddToWishlist',
  INITIATE_CHECKOUT: 'InitiateCheckout',
  ADD_PAYMENT_INFO: 'AddPaymentInfo',
  PURCHASE: 'Purchase',
  LEAD: 'Lead',
  COMPLETE_REGISTRATION: 'CompleteRegistration',
  CONTACT: 'Contact',
  CUSTOMIZE_PRODUCT: 'CustomizeProduct',
  DONATE: 'Donate',
  FIND_LOCATION: 'FindLocation',
  VIEW_CART: 'ViewCart',
  SUBSCRIBE: 'Subscribe',
  START_TRIAL: 'StartTrial',
  SUBMIT_APPLICATION: 'SubmitApplication',
} as const;

/**
 * Helper to create a PageView event
 */
export function createPageViewEvent(
  userData: MetaUserData,
  options?: {
    url?: string;
    timestamp?: number;
  }
): MetaEvent {
  return buildMetaEvent(
    META_EVENT_NAMES.PAGE_VIEW,
    userData,
    {
      content_type: 'page',
    },
    {
      eventSourceUrl: options?.url,
      timestamp: options?.timestamp,
    }
  );
}

/**
 * Helper to create a Purchase event
 */
export function createPurchaseEvent(
  userData: MetaUserData,
  purchaseData: {
    value: number;
    currency?: string;
    transactionId?: string;
    contentIds?: string[];
    numItems?: number;
  }
): MetaEvent {
  return buildMetaEvent(
    META_EVENT_NAMES.PURCHASE,
    userData,
    {
      value: purchaseData.value,
      currency: purchaseData.currency || 'USD',
      content_ids: purchaseData.contentIds,
      num_items: purchaseData.numItems || 1,
    },
    {
      eventId: purchaseData.transactionId,
    }
  );
}

/**
 * Helper to create a Lead event
 */
export function createLeadEvent(
  userData: MetaUserData,
  leadData?: {
    contentName?: string;
    value?: number;
    currency?: string;
  }
): MetaEvent {
  return buildMetaEvent(
    META_EVENT_NAMES.LEAD,
    userData,
    {
      content_name: leadData?.contentName,
      value: leadData?.value,
      currency: leadData?.currency || 'USD',
    }
  );
}

/**
 * Helper to create a CompleteRegistration event
 */
export function createRegistrationEvent(
  userData: MetaUserData,
  options?: {
    status?: string;
    timestamp?: number;
  }
): MetaEvent {
  return buildMetaEvent(
    META_EVENT_NAMES.COMPLETE_REGISTRATION,
    userData,
    {
      status: options?.status || 'completed',
    },
    {
      timestamp: options?.timestamp,
    }
  );
}

/**
 * Helper to create an AddToCart event
 */
export function createAddToCartEvent(
  userData: MetaUserData,
  cartData: {
    value: number;
    currency?: string;
    contentIds?: string[];
    numItems?: number;
  }
): MetaEvent {
  return buildMetaEvent(
    META_EVENT_NAMES.ADD_TO_CART,
    userData,
    {
      value: cartData.value,
      currency: cartData.currency || 'USD',
      content_ids: cartData.contentIds,
      num_items: cartData.numItems,
    }
  );
}

/**
 * Helper to create an InitiateCheckout event
 */
export function createCheckoutEvent(
  userData: MetaUserData,
  checkoutData: {
    value: number;
    currency?: string;
    contentIds?: string[];
    numItems?: number;
  }
): MetaEvent {
  return buildMetaEvent(
    META_EVENT_NAMES.INITIATE_CHECKOUT,
    userData,
    {
      value: checkoutData.value,
      currency: checkoutData.currency || 'USD',
      content_ids: checkoutData.contentIds,
      num_items: checkoutData.numItems,
    }
  );
}




