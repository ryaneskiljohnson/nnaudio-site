/*
  Test script: verifies that campaigns save and load full element blocks
  - Builds sample emailElements with diverse types and properties
  - Embeds full JSON into html_content as Base64 comment and simple divs
  - Inserts into email_campaigns using service role
  - Reads back, decodes, and deep-compares with original
  - Also tests fallback parse from divs (type + inner HTML)
*/

const { createClient } = require('@supabase/supabase-js');

function buildHtmlWithEmbed(elements) {
  const json = JSON.stringify(elements);
  // Use Node Buffer for base64
  const b64 = Buffer.from(json, 'utf8').toString('base64');
  const comment = `<!--ELEMENTS_B64:${b64}-->`;
  const body = elements
    .map((el) => `<div data-type="${el.type}" data-id="${el.id}">${el.content || ''}</div>`)
    .join('');
  return `${comment}${body}`;
}

function extractEmbeddedElements(html) {
  const m = html.match(/<!--ELEMENTS_B64:([^>]*)-->/);
  if (!m) return null;
  try {
    const json = Buffer.from(m[1], 'base64').toString('utf8');
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
}

function fallbackParseElements(html) {
  const re = /<div\s+[^>]*data-type="([^"]+)"[^>]*data-id="([^"]+)"[^>]*>([\s\S]*?)<\/div>/g;
  const out = [];
  let match;
  while ((match = re.exec(html)) !== null) {
    const [, type, id, inner] = match;
    out.push({ id, type, content: inner });
  }
  return out;
}

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  const supabase = createClient(url, key);

  // Build rich elements
  const nowId = (p) => `${p}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const elements = [
    {
      id: nowId('header'),
      type: 'header',
      content: 'Welcome to <span style="color:#6c63ff">Cymasphere</span>!',
      headerType: 'h1',
      fontFamily: 'Georgia, serif',
      fontSize: '34px',
      textColor: '#111111',
      backgroundColor: '#f0f0f0',
      textAlign: 'center',
      paddingTop: 16,
      paddingBottom: 16,
      fullWidth: false,
    },
    {
      id: nowId('text'),
      type: 'text',
      content: '<p>This is <strong>rich</strong> text with a <a href="https://cymasphere.com">link</a>.</p>',
      fontFamily: 'Arial, sans-serif',
      fontSize: '16px',
      textColor: '#333333',
      paddingTop: 16,
      paddingBottom: 16,
      fullWidth: false,
    },
    {
      id: nowId('button'),
      type: 'button',
      content: 'Get Started',
      url: 'https://cymasphere.com/start',
      buttonStyle: 'primary',
      fullWidth: false,
    },
    {
      id: nowId('brand-header'),
      type: 'brand-header',
      content: 'CYMASPHERE',
      backgroundColor: 'linear-gradient(135deg, #1a1a1a 0%, #121212 100%)',
      textColor: '#ffffff',
      logoStyle: 'gradient',
      fullWidth: true,
    },
    {
      id: nowId('divider'),
      type: 'divider',
      content: '',
    },
  ];

  const html = buildHtmlWithEmbed(elements);
  const text = elements.map((el) => el.content).join('\n');

  // Insert campaign
  const insertRes = await supabase
    .from('email_campaigns')
    .insert({
      name: `TEST Save ${Date.now()}`,
      subject: 'Test Save Elements',
      sender_name: 'Cymasphere',
      sender_email: 'support@cymasphere.com',
      reply_to_email: 'support@cymasphere.com',
      status: 'draft',
      html_content: html,
      text_content: text,
    })
    .select('id, html_content')
    .single();

  if (insertRes.error) {
    console.error('Insert error:', insertRes.error);
    process.exit(1);
  }

  const campaignId = insertRes.data.id;
  console.log('Inserted campaign id:', campaignId);

  // Read back
  const readRes = await supabase
    .from('email_campaigns')
    .select('id, html_content, text_content')
    .eq('id', campaignId)
    .single();

  if (readRes.error) {
    console.error('Read error:', readRes.error);
    process.exit(1);
  }

  const savedHtml = readRes.data.html_content || '';
  const embedded = extractEmbeddedElements(savedHtml);
  const fallback = fallbackParseElements(savedHtml);

  // Assertions
  const okEmbedded = Array.isArray(embedded) && deepEqual(embedded, elements);
  console.log('Embedded JSON equality:', okEmbedded ? 'OK' : 'FAIL');
  if (!okEmbedded) {
    console.log('Original:', JSON.stringify(elements));
    console.log('Decoded :', JSON.stringify(embedded));
  }

  const fallbackComparable = elements.map((e) => ({ id: e.id, type: e.type, content: e.content || '' }));
  const okFallback = deepEqual(fallback, fallbackComparable);
  console.log('Fallback HTML parse (type+content) equality:', okFallback ? 'OK' : 'FAIL');

  const allOk = okEmbedded && okFallback;
  console.log(allOk ? 'RESULT: PASS' : 'RESULT: FAIL');

  // Clean up test row unless KEEP_TEST_CAMPAIGN=1
  if (process.env.KEEP_TEST_CAMPAIGN === '1') {
    console.log('Keeping test campaign:', campaignId);
  } else {
    await supabase.from('email_campaigns').delete().eq('id', campaignId);
  }
  process.exit(allOk ? 0 : 2);
}

main().catch((e) => {
  console.error('Unhandled error:', e);
  process.exit(1);
});


