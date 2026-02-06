require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function testSpecificEmail() {
  console.log('🔍 INVESTIGATING THE MOST RECENT EMAIL SEND\n');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: { autoRefreshToken: false, persistSession: false }
    }
  );

  // Get the most recent email send
  const { data: recentSend } = await supabase
    .from('email_sends')
    .select('*')
    .order('sent_at', { ascending: false })
    .limit(1)
    .single();

  if (!recentSend) {
    console.log('❌ No recent email sends found');
    return;
  }

  console.log('📧 MOST RECENT EMAIL SEND:');
  console.log(`   Send ID: ${recentSend.id}`);
  console.log(`   Email: ${recentSend.email}`);
  console.log(`   Campaign: ${recentSend.campaign_id}`);
  console.log(`   Sent: ${recentSend.sent_at}`);
  console.log('');

  // Get the campaign details
  const { data: campaign } = await supabase
    .from('email_campaigns')
    .select('*')
    .eq('id', recentSend.campaign_id)
    .single();

  if (campaign) {
    console.log('📋 CAMPAIGN DETAILS:');
    console.log(`   Name: ${campaign.name}`);
    console.log(`   Subject: ${campaign.subject}`);
    console.log(`   Status: ${campaign.status}`);
    console.log(`   HTML Content Preview: ${(campaign.html_content || 'No content').slice(0, 100)}...`);
    console.log('');
  }

  // Get subscriber details
  const { data: subscriber } = await supabase
    .from('subscribers')
    .select('*')
    .eq('email', recentSend.email)
    .single();

  if (subscriber) {
    console.log('👤 SUBSCRIBER DETAILS:');
    console.log(`   ID: ${subscriber.id}`);
    console.log(`   Email: ${subscriber.email}`);
    console.log(`   Status: ${subscriber.status}`);
    console.log('');
  }

  // Generate what the tracking URL SHOULD be
  console.log('🔗 EXPECTED TRACKING URLS:');
  const baseUrl = 'https://cymasphere.com'; // Production URL
  const expectedPixelUrl = `${baseUrl}/api/email-campaigns/track/open?c=${recentSend.campaign_id}&u=${subscriber?.id || 'unknown'}&s=${recentSend.id}`;
  const expectedClickUrl = `${baseUrl}/api/email-campaigns/track/click?c=${recentSend.campaign_id}&u=${subscriber?.id || 'unknown'}&s=${recentSend.id}&url=https%3A%2F%2Fcymasphere.com`;
  
  console.log(`   Pixel URL: ${expectedPixelUrl}`);
  console.log(`   Click URL: ${expectedClickUrl}`);
  console.log('');

  // Test the tracking endpoints directly
  console.log('🧪 TESTING TRACKING ENDPOINTS:');
  
  try {
    console.log('   Testing pixel endpoint...');
    const pixelResponse = await fetch(expectedPixelUrl);
    console.log(`   Pixel Status: ${pixelResponse.status}`);
    console.log(`   Pixel Content-Type: ${pixelResponse.headers.get('content-type')}`);
    
    if (pixelResponse.status === 200) {
      console.log('   ✅ Pixel endpoint working');
      
      // Check if this created an open record
      setTimeout(async () => {
        const { data: newOpens } = await supabase
          .from('email_opens')
          .select('*')
          .eq('send_id', recentSend.id);
          
        if (newOpens && newOpens.length > 0) {
          console.log('   🎉 Open was recorded from test!');
        } else {
          console.log('   ⚠️ Test pixel call did not create open record');
        }
      }, 2000);
      
    } else {
      console.log('   ❌ Pixel endpoint failed');
    }
  } catch (error) {
    console.log(`   ❌ Error testing pixel: ${error.message}`);
  }

  // Check for any opens for this specific send
  console.log('\n📈 CHECKING FOR OPENS ON THIS SPECIFIC EMAIL:');
  const { data: opens } = await supabase
    .from('email_opens')
    .select('*')
    .eq('send_id', recentSend.id);

  if (opens && opens.length > 0) {
    console.log('   🎉 OPENS FOUND FOR THIS EMAIL!');
    opens.forEach((open, i) => {
      console.log(`   ${i + 1}. Opened: ${open.opened_at}`);
      console.log(`      IP: ${open.ip_address}`);
    });
  } else {
    console.log('   ⚠️ No opens found for this specific email');
  }

  console.log('\n💡 TROUBLESHOOTING STEPS:');
  console.log('1. Go back to your email');
  console.log('2. Look for "Images are not displayed" message');
  console.log('3. Make sure you clicked "Display images below"');
  console.log('4. If images are already showing, try:');
  console.log('   - Refreshing the email');
  console.log('   - Opening in a new tab');
  console.log('   - Checking if your ad blocker is blocking tracking pixels');
  console.log('5. Try clicking a link in the email to test click tracking');

  console.log('\n✅ Investigation complete!');
}

testSpecificEmail().catch(console.error); 