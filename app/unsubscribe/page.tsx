'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface UnsubscribeResponse {
  success: boolean;
  message: string;
  email?: string;
  status?: string;
}

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const rawEmail = searchParams.get('email');
  const token = searchParams.get('token');
  // Decode URL-encoded email
  const email = rawEmail ? decodeURIComponent(rawEmail) : null;
  const [response, setResponse] = useState<UnsubscribeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!email) {
      setError('No email address provided');
      return;
    }

    // Check if email is a placeholder (from preview)
    // Check for both {{email}} and URL-encoded %7B%7Bemail%7D%7D
    const isPlaceholder = email.includes('{{') || 
                         email.includes('%7B%7B') || 
                         email === '{{email}}' || 
                         rawEmail?.includes('%7B%7B') ||
                         rawEmail?.includes('{{');
    
    if (isPlaceholder) {
      setError('This is a preview link. In actual emails, this will contain your email address.');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Invalid email format. This appears to be a preview link.');
      return;
    }

    // Don't auto-unsubscribe - user must confirm by clicking the button
  }, [email, rawEmail]);

  const handleUnsubscribe = async () => {
    if (!email) return;

    // Double-check for placeholder before making API call
    if (email.includes('{{') || email.includes('%7B%7B') || email === '{{email}}') {
      setError('This is a preview link. In actual emails, this will contain your email address.');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Invalid email format. This appears to be a preview link.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, token }),
      });

      const data = await response.json();
      console.log('[Unsubscribe Page] API Response:', data);
      setResponse(data);

      if (!response.ok) {
        const errorMsg = data.error || 'Failed to unsubscribe';
        const details = data.details ? ` (${data.details})` : '';
        const fullError = `${errorMsg}${details}`;
        console.error('[Unsubscribe Page] API Error:', { status: response.status, data });
        throw new Error(fullError);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error('[Unsubscribe Page] Error:', err);
    } finally {
      setLoading(false);
    }
  };


  // Check if email is a placeholder (from preview)
  const isPlaceholder = email && (email.includes('{{') || email.includes('%7B%7B') || email === '{{email}}' || rawEmail?.includes('%7B%7B'));

  if (!email) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        width: '100vw',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif',
        backgroundColor: '#121212',
        padding: '40px 20px'
      }}>
        <div style={{ textAlign: 'center', maxWidth: '600px', width: '100%', padding: '20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📧</div>
          <div style={{ fontSize: '24px', marginBottom: '16px', color: '#ffffff', fontWeight: '600' }}>
            Invalid Unsubscribe Link
          </div>
          <div style={{ fontSize: '16px', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '24px', lineHeight: '1.6' }}>
            No email address provided. Please use the unsubscribe link from your email.
          </div>
          <Link 
            href="/" 
            style={{ 
              display: 'inline-block',
              padding: '12px 24px',
              background: 'linear-gradient(90deg, #6c63ff, #4ecdc4)',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: '600',
              transition: 'opacity 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      backgroundColor: '#121212', 
      minHeight: '100vh', 
      width: '100vw',
      padding: '0',
      margin: '0',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif',
      color: '#ffffff',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-start',
      paddingTop: '60px'
    }}>
      <div style={{ 
        width: '100%',
        maxWidth: '800px',
        margin: '0 auto',
        padding: '60px 40px',
        backgroundColor: '#1e1e1e',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
      }}>
        {/* Header */}
        <div style={{ 
          textAlign: 'center',
          marginBottom: '40px'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📧</div>
          <h1 style={{ margin: 0, fontSize: '32px', color: '#ffffff', fontWeight: '700', marginBottom: '12px' }}>Email Preferences</h1>
          <p style={{ margin: '12px 0 0 0', color: 'rgba(255, 255, 255, 0.7)', fontSize: '16px' }}>
            {isPlaceholder ? (
              <>
                This is a preview link. In actual emails, the email address will be shown here.
                <br />
                <span style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.5)', marginTop: '8px', display: 'block' }}>
                  To unsubscribe, use the link from an actual email you received.
                </span>
              </>
            ) : (
              <>Manage your email subscription for: <strong style={{ color: '#4ecdc4' }}>{email}</strong></>
            )}
          </p>
        </div>

        {/* Content */}
        <div>
          {loading && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: '24px', marginBottom: '16px' }}>⏳</div>
              <div style={{ fontSize: '18px', color: 'rgba(255, 255, 255, 0.7)' }}>Processing...</div>
            </div>
          )}

          {error && (
            <div style={{ 
              textAlign: 'center', 
              padding: '24px', 
              backgroundColor: '#1e1e1e',
              border: '1px solid rgba(255, 94, 98, 0.3)',
              borderRadius: '8px',
              marginBottom: '24px'
            }}>
              <div style={{ fontSize: '24px', marginBottom: '16px' }}>❌</div>
              <div style={{ fontSize: '16px', color: '#ff5e62', marginBottom: '8px' }}>{error}</div>
              <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)', marginTop: '8px' }}>
                Check the browser console and server logs for more details.
              </div>
            </div>
          )}

          {response && (
            <div style={{ 
              textAlign: 'center', 
              padding: '24px', 
              backgroundColor: '#1e1e1e',
              border: `1px solid ${response.success ? 'rgba(0, 201, 167, 0.3)' : 'rgba(255, 94, 98, 0.3)'}`,
              borderRadius: '8px',
              marginBottom: '24px'
            }}>
              <div style={{ fontSize: '24px', marginBottom: '16px' }}>
                {response.success ? '✅' : '❌'}
              </div>
              <div style={{ 
                fontSize: '16px', 
                color: response.success ? '#00c9a7' : '#ff5e62',
                marginBottom: '8px',
                fontWeight: '600'
              }}>
                {response.message}
              </div>
              {response.status && (
                <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)', marginTop: '8px' }}>
                  Status: <strong style={{ color: '#4ecdc4' }}>{response.status}</strong>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ textAlign: 'center', marginTop: '40px' }}>
            {!response ? (
              <button
                onClick={handleUnsubscribe}
                disabled={!!(loading || isPlaceholder)}
                style={{ 
                  padding: '14px 32px',
                  backgroundColor: isPlaceholder ? '#666' : '#ff5e62',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: (loading || isPlaceholder) ? 'not-allowed' : 'pointer',
                  opacity: (loading || isPlaceholder) ? 0.5 : 1,
                  transition: 'opacity 0.2s, transform 0.2s',
                  boxShadow: isPlaceholder ? 'none' : '0 4px 12px rgba(255, 94, 98, 0.3)'
                }}
                onMouseEnter={(e) => {
                  if (!loading && !isPlaceholder) {
                    e.currentTarget.style.opacity = '0.9';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = (loading || isPlaceholder) ? '0.5' : '1';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {loading ? 'Unsubscribing...' : isPlaceholder ? 'Preview Mode - Use Link from Email' : 'Unsubscribe from Emails'}
              </button>
            ) : null}
          </div>

          {/* Info */}
          <div style={{ 
            marginTop: '40px', 
            padding: '24px', 
            backgroundColor: '#1e1e1e', 
            borderRadius: '8px',
            fontSize: '14px',
            color: 'rgba(255, 255, 255, 0.7)',
            lineHeight: '1.6',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#ffffff', fontSize: '18px', fontWeight: '600' }}>What happens when you unsubscribe?</h3>
            <ul style={{ margin: '0', paddingLeft: '20px', listStyle: 'none' }}>
              <li style={{ marginBottom: '8px', paddingLeft: '20px', position: 'relative' }}>
                <span style={{ position: 'absolute', left: '0', color: '#4ecdc4' }}>•</span>
                You'll stop receiving marketing emails from NNAudio
              </li>
              <li style={{ marginBottom: '8px', paddingLeft: '20px', position: 'relative' }}>
                <span style={{ position: 'absolute', left: '0', color: '#4ecdc4' }}>•</span>
                Your email will be marked as unsubscribed in our system
              </li>
              <li style={{ marginBottom: '8px', paddingLeft: '20px', position: 'relative' }}>
                <span style={{ position: 'absolute', left: '0', color: '#4ecdc4' }}>•</span>
                To resubscribe, please contact support or an administrator
              </li>
              <li style={{ marginBottom: '0', paddingLeft: '20px', position: 'relative' }}>
                <span style={{ position: 'absolute', left: '0', color: '#4ecdc4' }}>•</span>
                You may still receive important account-related emails
              </li>
            </ul>
        </div>

        {/* Footer */}
        <div style={{ 
            marginTop: '40px',
            paddingTop: '30px',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          textAlign: 'center'
        }}>
            <Link 
            href="/" 
            style={{ 
              color: '#6c63ff', 
              textDecoration: 'none',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'color 0.2s'
            }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#4ecdc4'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#6c63ff'}
          >
            ← Return to NNAudio
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function UnsubscribeFallback() {
  return (
    <div style={{
      backgroundColor: '#121212',
      minHeight: '100vh',
      width: '100vw',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif',
      color: '#ffffff',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📧</div>
        <div style={{ fontSize: '18px', color: 'rgba(255, 255, 255, 0.7)' }}>Loading...</div>
      </div>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={<UnsubscribeFallback />}>
      <UnsubscribeContent />
    </Suspense>
  );
}
