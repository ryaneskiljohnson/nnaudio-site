import crypto from 'crypto';

/**
 * Secret key for signing unsubscribe tokens
 * In production, this should be stored in an environment variable
 */
const getUnsubscribeSecret = (): string => {
  return process.env.UNSUBSCRIBE_TOKEN_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'default-secret-change-in-production';
};

/**
 * Generate a signed token for unsubscribe links
 * Token includes: email, timestamp, and a random nonce
 * Expires after 30 days
 */
export function generateUnsubscribeToken(email: string): string {
  const secret = getUnsubscribeSecret();
  const timestamp = Date.now();
  const nonce = crypto.randomBytes(16).toString('hex');
  
  // Create payload: email|timestamp|nonce
  const payload = `${email.toLowerCase()}|${timestamp}|${nonce}`;
  
  // Create HMAC signature
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const signature = hmac.digest('hex');
  
  // Return base64 encoded token: payload.signature
  const token = Buffer.from(`${payload}.${signature}`).toString('base64url');
  return token;
}

/**
 * Verify and decode an unsubscribe token
 * Returns the email if valid, null if invalid or expired
 */
export function verifyUnsubscribeToken(token: string, maxAgeDays: number = 30): string | null {
  try {
    const secret = getUnsubscribeSecret();
    
    // Decode base64url token
    const decoded = Buffer.from(token, 'base64url').toString('utf-8');
    const [payload, signature] = decoded.split('.');
    
    if (!payload || !signature) {
      return null;
    }
    
    // Verify signature
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    const expectedSignature = hmac.digest('hex');
    
    // Use timing-safe comparison to prevent timing attacks
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return null;
    }
    
    // Parse payload: email|timestamp|nonce
    const [email, timestampStr, nonce] = payload.split('|');
    
    if (!email || !timestampStr) {
      return null;
    }
    
    // Check expiration (30 days default)
    const timestamp = parseInt(timestampStr, 10);
    const maxAge = maxAgeDays * 24 * 60 * 60 * 1000; // Convert days to milliseconds
    const age = Date.now() - timestamp;
    
    if (age > maxAge) {
      return null; // Token expired
    }
    
    if (age < 0) {
      return null; // Token from future (clock skew)
    }
    
    return email.toLowerCase();
  } catch (error) {
    console.error('[Unsubscribe Token] Verification error:', error);
    return null;
  }
}

/**
 * Generate unsubscribe URL with token
 */
export function generateUnsubscribeUrl(email: string, baseUrl?: string): string {
  const token = generateUnsubscribeToken(email);
  const siteUrl = baseUrl || process.env.NEXT_PUBLIC_SITE_URL || 'https://nnaud.io';
  return `${siteUrl}/unsubscribe?email=${encodeURIComponent(email)}&token=${token}`;
}

