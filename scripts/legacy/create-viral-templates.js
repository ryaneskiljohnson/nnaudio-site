// create-viral-templates.js
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase URL or Service Role Key in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const logoUrl = 'https://cymasphere.com/cymasphere-logo.png';
const bannerUrl = 'https://cymasphere.com/images/features/temp.jpg';
const mainColor = '#6c63ff';
const footerBg = '#f5f6fa';

function wrapEmail({ title, bodyHtml }) {
  return `
  <div style="background:${footerBg};padding:0;margin:0;font-family:sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(108,99,255,0.08);">
      <tr>
        <td style="background:${mainColor};padding:24px 0;text-align:center;">
          <img src="${logoUrl}" alt="Cymasphere" style="height:48px;vertical-align:middle;" />
        </td>
      </tr>
      <tr>
        <td style="padding:0;text-align:center;">
          <img src="${bannerUrl}" alt="Music Harmony" style="width:100%;max-height:180px;object-fit:cover;" />
        </td>
      </tr>
      <tr>
        <td style="padding:32px 32px 16px 32px;">
          <h2 style="color:${mainColor};margin-top:0;">${title}</h2>
          ${bodyHtml}
        </td>
      </tr>
      <tr>
        <td style="padding:24px 32px 32px 32px;">
          <div style="border-top:1px solid #eee;padding-top:16px;font-size:13px;color:#888;text-align:center;">
            <p style="margin:0 0 8px 0;">Made with <span style="color:${mainColor};">Cymasphere</span> • <a href="https://cymasphere.com" style="color:${mainColor};text-decoration:none;">cymasphere.com</a></p>
            <p style="margin:0;">You are receiving this email because you signed up for Cymasphere. <a href="{{unsubscribeUrl}}" style="color:#888;text-decoration:underline;">Unsubscribe</a></p>
          </div>
        </td>
      </tr>
    </table>
  </div>
  `;
}

const templates = [
  {
    name: "How I Composed a Song in 10 Minutes (No Theory Needed)",
    subject: "How I Composed a Song in 10 Minutes (No Theory Needed)",
    description: "Showcase of Cymasphere's effortless harmony and chord tools.",
    html_content: wrapEmail({
      title: "How I Composed a Song in 10 Minutes (No Theory Needed)",
      bodyHtml: `
        <p>Hi {{firstName}},</p>
        <p><b>This is exactly how I created a full song—complete with rich harmonies and beautiful chord progressions—in just 10 minutes using Cymasphere.</b></p>
        <ul style="padding-left:20px;margin:16px 0;">
          <li>Visualize and experiment with scales and chords instantly</li>
          <li>Effortless drag-and-drop composition</li>
          <li>No music theory required</li>
        </ul>
        <p style="margin:24px 0 16px 0;text-align:center;">
          <a href="https://cymasphere.com/demo" style="background:${mainColor};color:#fff;padding:12px 32px;border-radius:6px;text-decoration:none;font-weight:bold;">🎵 Listen to the Demo</a>
        </p>
        <p>Ready to try it yourself? <a href="https://cymasphere.com" style="color:${mainColor};font-weight:bold;">Start composing now</a>.</p>
      `
    }),
    text_content: `Hi {{firstName}},\n\nThis is exactly how I created a full song—complete with rich harmonies and beautiful chord progressions—in just 10 minutes using Cymasphere.\n\n- Visualize and experiment with scales and chords instantly\n- Effortless drag-and-drop composition\n- No music theory required\n\nListen to the demo: https://cymasphere.com/demo\nTry it yourself: https://cymasphere.com`,
    template_type: 'custom',
    status: 'active',
  },
  {
    name: "You Don't Need Years of Theory to Write Great Music",
    subject: "You Don't Need Years of Theory to Write Great Music",
    description: "Debunking the myth that music theory is required for harmony.",
    html_content: wrapEmail({
      title: "You Don't Need Years of Theory to Write Great Music",
      bodyHtml: `
        <p>Hey {{firstName}},</p>
        <p>Everyone says you need years of music theory to write beautiful harmonies. <b>Here's why that's wrong...</b></p>
        <p>Cymasphere makes harmony intuitive. Our visual tools let you play with scales and chords, so you can compose music you love—without memorizing a single scale.</p>
        <ul style="padding-left:20px;margin:16px 0;">
          <li>Instant chord suggestions</li>
          <li>Visual scale navigation</li>
          <li>One-click reharmonization</li>
        </ul>
        <p style="margin:24px 0 16px 0;text-align:center;">
          <a href="https://cymasphere.com" style="background:${mainColor};color:#fff;padding:12px 32px;border-radius:6px;text-decoration:none;font-weight:bold;">Start composing with Cymasphere</a>
        </p>
      `
    }),
    text_content: `Hey {{firstName}},\n\nEveryone says you need years of music theory to write beautiful harmonies. Here's why that's wrong...\n\nCymasphere makes harmony intuitive. Our visual tools let you play with scales and chords, so you can compose music you love—without memorizing a single scale.\n\n- Instant chord suggestions\n- Visual scale navigation\n- One-click reharmonization\n\nStart composing: https://cymasphere.com`,
    template_type: 'custom',
    status: 'active',
  },
  {
    name: "5 Ways Cymasphere Makes Music Effortless",
    subject: "5 Ways Cymasphere Makes Music Effortless",
    description: "Highlighting Cymasphere features for fast, creative composition.",
    html_content: wrapEmail({
      title: "5 Ways Cymasphere Makes Music Effortless",
      bodyHtml: `
        <p>Hi {{firstName}},</p>
        <p>After years of testing music apps, here's what actually matters for effortless composition—and what Cymasphere nails:</p>
        <ol style="padding-left:20px;margin:16px 0;">
          <li>Instant chord suggestions</li>
          <li>Visual scale navigation</li>
          <li>One-click reharmonization</li>
          <li>Real-time voicing previews</li>
          <li>Drag-and-drop arrangement</li>
        </ol>
        <p>More music, less friction. That's why creators love Cymasphere.</p>
        <p style="margin:24px 0 16px 0;text-align:center;">
          <a href="https://cymasphere.com" style="background:${mainColor};color:#fff;padding:12px 32px;border-radius:6px;text-decoration:none;font-weight:bold;">See for yourself</a>
        </p>
      `
    }),
    text_content: `Hi {{firstName}},\n\nAfter years of testing music apps, here's what actually matters for effortless composition—and what Cymasphere nails:\n1. Instant chord suggestions\n2. Visual scale navigation\n3. One-click reharmonization\n4. Real-time voicing previews\n5. Drag-and-drop arrangement\n\nMore music, less friction. See for yourself: https://cymasphere.com`,
    template_type: 'custom',
    status: 'active',
  },
  {
    name: "3 Questions to Ask Before Choosing a Music Tool",
    subject: "3 Questions to Ask Before Choosing a Music Tool",
    description: "Guiding users to evaluate their music tools for harmony and ease.",
    html_content: wrapEmail({
      title: "3 Questions to Ask Before Choosing a Music Tool",
      bodyHtml: `
        <p>Hi {{firstName}},</p>
        <p>Ask yourself these 3 questions before picking your next music composition tool:</p>
        <ol style="padding-left:20px;margin:16px 0;">
          <li>Does it make harmony intuitive?</li>
          <li>Can you experiment with scales and chords visually?</li>
          <li>Does it help you finish songs, not just start them?</li>
        </ol>
        <p>If you answered "no" to any, you need Cymasphere.</p>
        <p style="margin:24px 0 16px 0;text-align:center;">
          <a href="https://cymasphere.com" style="background:${mainColor};color:#fff;padding:12px 32px;border-radius:6px;text-decoration:none;font-weight:bold;">Discover effortless harmony</a>
        </p>
      `
    }),
    text_content: `Hi {{firstName}},\n\nAsk yourself these 3 questions before picking your next music composition tool:\n1. Does it make harmony intuitive?\n2. Can you experiment with scales and chords visually?\n3. Does it help you finish songs, not just start them?\n\nIf you answered "no" to any, you need Cymasphere.\n\nDiscover effortless harmony: https://cymasphere.com`,
    template_type: 'custom',
    status: 'active',
  },
  {
    name: "The Secret to Effortless Harmony (No One Talks About This)",
    subject: "The Secret to Effortless Harmony (No One Talks About This)",
    description: "Revealing Cymasphere's unique approach to harmony and composition.",
    html_content: wrapEmail({
      title: "The Secret to Effortless Harmony (No One Talks About This)",
      bodyHtml: `
        <p>Hey {{firstName}},</p>
        <p>Here's what no one tells you about writing music: Most tools make harmony harder, not easier.</p>
        <p><b>Cymasphere flips the script.</b> Our Harmony Palette lets you play with chords and scales, not just notes. It's the secret to effortless composition.</p>
        <p style="margin:24px 0 16px 0;text-align:center;">
          <a href="https://cymasphere.com" style="background:${mainColor};color:#fff;padding:12px 32px;border-radius:6px;text-decoration:none;font-weight:bold;">Unlock the secret</a>
        </p>
      `
    }),
    text_content: `Hey {{firstName}},\n\nHere's what no one tells you about writing music: Most tools make harmony harder, not easier.\n\nCymasphere flips the script. Our Harmony Palette lets you play with chords and scales, not just notes. It's the secret to effortless composition.\n\nUnlock the secret: https://cymasphere.com`,
    template_type: 'custom',
    status: 'active',
  },
  {
    name: "How I Finally Broke Through My Music Block",
    subject: "How I Finally Broke Through My Music Block",
    description: "Personal story of overcoming music theory struggles with Cymasphere.",
    html_content: wrapEmail({
      title: "How I Finally Broke Through My Music Block",
      bodyHtml: `
        <p>Hi {{firstName}},</p>
        <p>After years of struggling with music theory, I finally figured out how to write songs I love—thanks to Cymasphere's visual harmony tools.</p>
        <p>If you've ever felt stuck, you're not alone. Cymasphere helped me break through and find my sound.</p>
        <p style="margin:24px 0 16px 0;text-align:center;">
          <a href="https://cymasphere.com" style="background:${mainColor};color:#fff;padding:12px 32px;border-radius:6px;text-decoration:none;font-weight:bold;">Start your journey</a>
        </p>
      `
    }),
    text_content: `Hi {{firstName}},\n\nAfter years of struggling with music theory, I finally figured out how to write songs I love—thanks to Cymasphere's visual harmony tools.\n\nIf you've ever felt stuck, you're not alone. Cymasphere helped me break through and find my sound.\n\nStart your journey: https://cymasphere.com`,
    template_type: 'custom',
    status: 'active',
  },
  {
    name: "I Wasted Years on Theory—Here's What Changed Everything",
    subject: "I Wasted Years on Theory—Here's What Changed Everything",
    description: "Being honest about mistakes and how Cymasphere changes the game.",
    html_content: wrapEmail({
      title: "I Wasted Years on Theory—Here's What Changed Everything",
      bodyHtml: `
        <p>Hey {{firstName}},</p>
        <p>I wasted years thinking I had to learn every scale and chord by heart. Here's what changed everything: Cymasphere's intuitive interface made harmony and composition feel natural.</p>
        <p>You don't need to be perfect. You just need the right tool.</p>
        <p style="margin:24px 0 16px 0;text-align:center;">
          <a href="https://cymasphere.com" style="background:${mainColor};color:#fff;padding:12px 32px;border-radius:6px;text-decoration:none;font-weight:bold;">Compose with Cymasphere</a>
        </p>
      `
    }),
    text_content: `Hey {{firstName}},\n\nI wasted years thinking I had to learn every scale and chord by heart. Here's what changed everything: Cymasphere's intuitive interface made harmony and composition feel natural.\n\nYou don't need to be perfect. You just need the right tool.\n\nCompose with Cymasphere: https://cymasphere.com`,
    template_type: 'custom',
    status: 'active',
  },
];

async function main() {
  // Delete all existing custom templates first
  await supabase.from('email_templates').delete().eq('template_type', 'custom');
  for (const template of templates) {
    const { data, error } = await supabase.from('email_templates').insert([template]);
    if (error) {
      console.error(`Failed to insert template '${template.name}':`, error.message);
    } else {
      console.log(`Inserted template: ${template.name}`);
    }
  }
  console.log('Done.');
}

main(); 