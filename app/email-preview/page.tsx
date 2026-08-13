'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DOMPurify from 'isomorphic-dompurify';

function EmailPreviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const campaignId = searchParams.get('c');
  const forceIframe = (searchParams.get('frame') === '1') || (searchParams.get('iframe') === '1') || (searchParams.get('f') === '1');
  const disableIframe = searchParams.get('noframe') === '1';
  const [emailHtml, setEmailHtml] = useState<string>('');
  const [bodyHtml, setBodyHtml] = useState<string>('');
  const [useIframe, setUseIframe] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Debug: initial params
  useEffect(() => {
    console.log('[EmailPreview] mounted with campaignId:', campaignId);
  }, [campaignId]);

  // Extract <head> assets and <body> HTML so styles apply properly without an iframe
  useEffect(() => {
    if (!emailHtml) {
      setBodyHtml('');
      // If forcing iframe and no HTML yet, keep iframe true
      setUseIframe(forceIframe);
      return;
    }

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(emailHtml, 'text/html');

      // NOTE: We intentionally do NOT inject the campaign's <head> nodes
      // (style/link/meta) into the parent document — doing so would let
      // untrusted campaign HTML run styles/trackers in our origin. The
      // full HTML is rendered inside a sandboxed iframe instead.
      const extracted = doc.body ? doc.body.innerHTML : '';
      setBodyHtml(extracted);
      // Default to iframe unless explicitly disabled via ?noframe=1
      const finalIframe = disableIframe ? false : true;
      setUseIframe(finalIframe);
    } catch (e) {
      console.error('[EmailPreview] HTML parse error:', e);
      setBodyHtml('');
      setUseIframe(true);
    }
  }, [emailHtml, forceIframe, disableIframe]);

  useEffect(() => {
    if (!campaignId) {
      setError('No campaign ID provided');
      setLoading(false);
      return;
    }

    const fetchEmailPreview = async () => {
      console.log('[EmailPreview] Fetching preview for:', campaignId);
      try {
        setLoading(true);
        const { previewEmail } = await import('@/app/actions/email-campaigns/media');
        const data = await previewEmail(campaignId);

        console.log('[EmailPreview] Server function success flag:', data?.success, 'HTML length:', (data?.html || '').length);
        if (data.success && data.html) {
          setEmailHtml(data.html);
          console.log('[EmailPreview] Set emailHtml length:', data.html.length);
        } else {
          throw new Error(data.error || 'Failed to generate email preview');
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'An error occurred';
        console.error('[EmailPreview] Fetch error:', msg, err);
        setError(msg);
      } finally {
        setLoading(false);
        console.log('[EmailPreview] Loading complete.');
      }
    };

    fetchEmailPreview();
  }, [campaignId]);

  if (loading) {
    return (
      <div style={{ position: 'fixed', inset: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#ffffff', fontFamily: 'Arial, sans-serif' }}>
        Loading email preview...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ position: 'fixed', inset: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#ffffff', fontFamily: 'Arial, sans-serif' }}>
        <div style={{ textAlign: 'center', maxWidth: 600 }}>
          <div style={{ fontSize: 18, color: '#d00', marginBottom: 12 }}>Failed to load preview</div>
          <div style={{ fontSize: 14, color: '#555', marginBottom: 20 }}>{error}</div>
          <button onClick={() => router.push('/')} style={{ padding: '10px 16px', background: '#6c63ff', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Go to NNAudio</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#ffffff', zIndex: 9999 }}>
      {useIframe ? (
        <iframe
          key={`preview-${campaignId}`}
          ref={iframeRef}
          // Sandbox without allow-scripts: email HTML never needs to execute JS,
          // so this neutralizes stored-XSS in campaign content while still
          // rendering styles/images.
          sandbox="allow-same-origin"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none', background: '#ffffff' }}
          srcDoc={emailHtml}
        />
      ) : (
        <div
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(bodyHtml || '<div style="font-family:Arial,sans-serif;padding:20px">No preview HTML.</div>') }}
          style={{ position: 'absolute', inset: 0, overflow: 'auto', background: '#ffffff' }}
        />
      )}
      {/* Debug overlay */}
      <div style={{
        position: 'fixed', left: 8, bottom: 8, fontFamily: 'Arial, sans-serif',
        fontSize: 11, color: '#666', background: 'rgba(255,255,255,0.9)',
        border: '1px solid #e0e0e0', borderRadius: 6, padding: '6px 8px'
      }}>
        <span>id: {campaignId || 'none'}</span>
        <span style={{ margin: '0 6px' }}>|</span>
        <span>html: {emailHtml ? emailHtml.length : 0}</span>
        <span style={{ margin: '0 6px' }}>|</span>
        <span>body: {bodyHtml ? bodyHtml.length : 0}</span>
        <span style={{ margin: '0 6px' }}>|</span>
        <span>iframe: {useIframe ? 'yes' : 'no'}</span>
        {error ? (<><span style={{ margin: '0 6px' }}>|</span><span style={{ color: '#d00' }}>err</span></>) : null}
      </div>
      <button
        onClick={() => router.push('/')}
        aria-label="Close"
        style={{ position: 'fixed', top: 16, right: 16, width: 44, height: 44, borderRadius: 22, border: 'none', cursor: 'pointer', background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: 18, lineHeight: '44px', textAlign: 'center', zIndex: 10000 }}
      >
        ×
      </button>
    </div>
  );
}

export default function EmailPreviewPage() {
  return (
    <Suspense fallback={
      <div style={{ position: 'fixed', inset: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#ffffff', fontFamily: 'Arial, sans-serif' }}>
        Loading email preview...
      </div>
    }>
      <EmailPreviewContent />
    </Suspense>
  );
}
