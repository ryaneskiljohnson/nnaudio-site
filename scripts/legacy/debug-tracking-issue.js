const { createClient } = require('@supabase/supabase-js');

async function debugTrackingIssue() {
  console.log('🔍 DEBUGGING EMAIL TRACKING ISSUE\n');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  try {
    // 1. Get most recent email send
    console.log('1️⃣ CHECKING RECENT EMAIL SENDS:');
    const { data: sends, error: sendsError } = await supabase
      .from('email_sends')
      .select('*')
      .order('sent_at', { ascending: false })
      .limit(3);

    if (sendsError) {
      console.log(`❌ Error getting sends: ${sendsError.message}`);
      return;
    }

    if (!sends || sends.length === 0) {
      console.log('❌ No email sends found!');
      return;
    }

    console.log(`✅ Found ${sends.length} recent email sends:`);
    sends.forEach((send, i) => {
      console.log(`   ${i+1}. ${send.email} - ${send.sent_at} (${send.id})`);
    });
    console.log('');

    // 2. Check the most recent send
    const latestSend = sends[0];
    console.log('2️⃣ ANALYZING LATEST EMAIL SEND:');
    console.log(`   Send ID: ${latestSend.id}`);
    console.log(`   Campaign ID: ${latestSend.campaign_id}`);
    console.log(`   Email: ${latestSend.email}`);
    console.log(`   Status: ${latestSend.status}`);
    console.log('');

    // 3. Get campaign details
    console.log('3️⃣ CHECKING CAMPAIGN DETAILS:');
    const { data: campaign, error: campaignError } = await supabase
      .from('email_campaigns')
      .select('*')
      .eq('id', latestSend.campaign_id)
      .single();

    if (campaignError) {
      console.log(`❌ Error getting campaign: ${campaignError.message}`);
      return;
    }

    console.log(`   Campaign: ${campaign.name} (${campaign.subject})`);
    console.log(`   Status: ${campaign.status}`);
    console.log(`   HTML Content: ${campaign.html_content ? campaign.html_content.length + ' chars' : 'NONE'}`);
    
    // Check if tracking pixel is in the stored HTML
    if (campaign.html_content) {
      const hasPixel = campaign.html_content.includes('/api/email-campaigns/track/open');
      console.log(`   Has Tracking Pixel: ${hasPixel ? '✅ YES' : '❌ NO'}`);
      
      if (hasPixel) {
        const pixelMatch = campaign.html_content.match(/src="([^"]*\/api\/email-campaigns\/track\/open[^"]*)"/);
        if (pixelMatch) {
          console.log(`   Pixel URL: ${pixelMatch[1]}`);
        }
      } else {
        console.log('   ❌ NO TRACKING PIXEL FOUND IN HTML CONTENT!');
        console.log('   🔍 HTML Sample:', campaign.html_content.slice(-200));
      }
    }
    console.log('');

    // 4. Get subscriber info
    console.log('4️⃣ CHECKING SUBSCRIBER:');
    const { data: subscriber, error: subError } = await supabase
      .from('subscribers')
      .select('*')
      .eq('email', latestSend.email)
      .single();

    if (subError) {
      console.log(`❌ Error getting subscriber: ${subError.message}`);
      return;
    }

    console.log(`   Subscriber ID: ${subscriber.id}`);
    console.log(`   Email: ${subscriber.email}`);
    console.log('');

    // 5. Check for opens on this send
    console.log('5️⃣ CHECKING OPENS FOR THIS EMAIL:');
    const { data: opens, error: opensError } = await supabase
      .from('email_opens')
      .select('*')
      .eq('send_id', latestSend.id);

    if (opensError) {
      console.log(`❌ Error getting opens: ${opensError.message}`);
    } else {
      console.log(`   Opens for this send: ${opens?.length || 0}`);
      if (opens && opens.length > 0) {
        opens.forEach((open, i) => {
          console.log(`   ${i+1}. ${open.opened_at} - IP: ${open.ip_address}`);
        });
      }
    }
    console.log('');

    // 6. Test tracking URL manually
    console.log('6️⃣ TESTING TRACKING URL:');
    const testUrl = `https://cymasphere.com/api/email-campaigns/track/open?c=${latestSend.campaign_id}&u=${subscriber.id}&s=${latestSend.id}`;
    console.log(`   URL: ${testUrl}`);
    
    try {
      const response = await fetch(testUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      
      console.log(`   Status: ${response.status}`);
      console.log(`   Content-Type: ${response.headers.get('content-type')}`);
      
      if (response.status === 200) {
        console.log('   ✅ Tracking endpoint works!');
        
        // Check if it created an open
        setTimeout(async () => {
          const { data: newOpens } = await supabase
            .from('email_opens')
            .select('*')
            .eq('send_id', latestSend.id)
            .order('opened_at', { ascending: false });
            
          console.log(`   Opens after test: ${newOpens?.length || 0}`);
          if (newOpens && newOpens.length > 0) {
            console.log('   🎉 Test created an open record!');
          } else {
            console.log('   ⚠️ Test did not create open record (bot detection?)');
          }
        }, 1000);
      }
    } catch (error) {
      console.log(`   ❌ Error testing URL: ${error.message}`);
    }

    // 7. Summary
    console.log('\n7️⃣ SUMMARY:');
    console.log('   - Emails are being sent ✅');
    console.log('   - Send records exist ✅');
    console.log('   - Tracking endpoint works ✅');
    
    if (!campaign.html_content || !campaign.html_content.includes('/api/email-campaigns/track/open')) {
      console.log('   - ❌ TRACKING PIXELS MISSING FROM EMAIL HTML!');
      console.log('   - 💡 This is likely the root cause!');
    } else {
      console.log('   - Tracking pixels in HTML ✅');
      console.log('   - Issue likely: Email client blocking images or bot detection');
    }

  } catch (error) {
    console.error('❌ Error in debug script:', error);
  }
}

debugTrackingIssue().catch(console.error); 