require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function checkTrackingResults() {
  console.log('🔍 CHECKING EMAIL TRACKING RESULTS\n');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: { autoRefreshToken: false, persistSession: false }
    }
  );

  // 1. Check recent email sends
  console.log('1️⃣ RECENT EMAIL SENDS:');
  const { data: sends, error: sendsError } = await supabase
    .from('email_sends')
    .select('*')
    .order('sent_at', { ascending: false })
    .limit(5);

  if (sendsError) {
    console.log(`   ❌ Error: ${sendsError.message}\n`);
    return;
  }

  if (sends && sends.length > 0) {
    sends.forEach((send, i) => {
      console.log(`   ${i + 1}. Send ID: ${send.id}`);
      console.log(`      Email: ${send.email}`);
      console.log(`      Campaign: ${send.campaign_id}`);
      console.log(`      Status: ${send.status}`);
      console.log(`      Sent: ${send.sent_at}`);
      console.log('');
    });
  } else {
    console.log('   ⚠️ No email sends found\n');
    return;
  }

  // 2. Check email opens (THE CRITICAL TEST!)
  console.log('2️⃣ EMAIL OPENS (This is what we\'re testing!):');
  const { data: opens, error: opensError } = await supabase
    .from('email_opens')
    .select('*')
    .order('opened_at', { ascending: false })
    .limit(10);

  if (opensError) {
    console.log(`   ❌ Error: ${opensError.message}\n`);
  } else if (opens && opens.length > 0) {
    console.log('   🎉 EMAIL OPENS FOUND! TRACKING IS WORKING! 🎉\n');
    opens.forEach((open, i) => {
      console.log(`   ${i + 1}. 📧 OPEN TRACKED!`);
      console.log(`      Send ID: ${open.send_id}`);
      console.log(`      Campaign: ${open.campaign_id}`);
      console.log(`      Subscriber: ${open.subscriber_id}`);
      console.log(`      Opened: ${open.opened_at}`);
      console.log(`      IP: ${open.ip_address || 'Unknown'}`);
      console.log(`      User Agent: ${(open.user_agent || 'Unknown').slice(0, 50)}...`);
      console.log('');
    });
  } else {
    console.log('   ⚠️ No email opens found yet');
    console.log('   💡 This could mean:');
    console.log('      - Images are still blocked in your email client');
    console.log('      - You need to wait a few seconds after allowing images');
    console.log('      - The tracking pixel hasn\'t loaded yet');
    console.log('      - Try refreshing the email or opening it again');
    console.log('');
  }

  // 3. Check email clicks
  console.log('3️⃣ EMAIL CLICKS:');
  const { data: clicks, error: clicksError } = await supabase
    .from('email_clicks')
    .select('*')
    .order('clicked_at', { ascending: false })
    .limit(5);

  if (clicksError) {
    console.log(`   ❌ Error: ${clicksError.message}\n`);
  } else if (clicks && clicks.length > 0) {
    console.log('   🖱️ EMAIL CLICKS FOUND!\n');
    clicks.forEach((click, i) => {
      console.log(`   ${i + 1}. 🔗 CLICK TRACKED!`);
      console.log(`      Send ID: ${click.send_id}`);
      console.log(`      Campaign: ${click.campaign_id}`);
      console.log(`      URL: ${click.url}`);
      console.log(`      Clicked: ${click.clicked_at}`);
      console.log('');
    });
  } else {
    console.log('   ⚠️ No email clicks found');
    console.log('   💡 Click a link in the email to test click tracking');
    console.log('');
  }

  // 4. Check campaign stats
  console.log('4️⃣ CAMPAIGN STATISTICS:');
  const { data: campaigns, error: campaignsError } = await supabase
    .from('email_campaigns')
    .select('id, name, status, total_recipients, emails_sent, emails_opened, emails_clicked, sent_at')
    .order('sent_at', { ascending: false })
    .limit(3);

  if (campaignsError) {
    console.log(`   ❌ Error: ${campaignsError.message}\n`);
  } else if (campaigns && campaigns.length > 0) {
    campaigns.forEach((campaign, i) => {
      const openRate = campaign.total_recipients > 0 ? 
        Math.round((campaign.emails_opened / campaign.total_recipients) * 100) : 0;
      const clickRate = campaign.total_recipients > 0 ? 
        Math.round((campaign.emails_clicked / campaign.total_recipients) * 100) : 0;
        
      console.log(`   ${i + 1}. ${campaign.name} (${campaign.status})`);
      console.log(`      Recipients: ${campaign.total_recipients || 0}`);
      console.log(`      Sent: ${campaign.emails_sent || 0}`);
      console.log(`      Opens: ${campaign.emails_opened || 0} (${openRate}%)`);
      console.log(`      Clicks: ${campaign.emails_clicked || 0} (${clickRate}%)`);
      console.log(`      Sent At: ${campaign.sent_at ? campaign.sent_at.slice(0, 16) : 'Not sent'}`);
      
      if (campaign.emails_opened > 0) {
        console.log('      🎉 THIS CAMPAIGN HAS TRACKED OPENS! 🎉');
      }
      if (campaign.emails_clicked > 0) {
        console.log('      🖱️ THIS CAMPAIGN HAS TRACKED CLICKS! 🖱️');
      }
      console.log('');
    });
  }

  // 5. Summary
  console.log('5️⃣ TRACKING STATUS SUMMARY:');
  const hasOpens = opens && opens.length > 0;
  const hasClicks = clicks && clicks.length > 0;
  
  if (hasOpens || hasClicks) {
    console.log('   ✅ SUCCESS! Email tracking is working!');
    if (hasOpens) console.log('   📧 Open tracking: WORKING');
    if (hasClicks) console.log('   🔗 Click tracking: WORKING');
  } else {
    console.log('   ⚠️ No tracking events found yet');
    console.log('   🔄 Try these steps:');
    console.log('      1. Make sure you clicked "Display images" in Gmail');
    console.log('      2. Wait 10-30 seconds after allowing images');
    console.log('      3. Try clicking a link in the email');
    console.log('      4. Refresh this page and check again');
  }

  console.log('\n✅ Tracking check complete!');
}

checkTrackingResults().catch(console.error); 