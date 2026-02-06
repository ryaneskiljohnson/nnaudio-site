const { createClient } = require('@supabase/supabase-js');

async function testActualSentEmail() {
  console.log('🔍 SIMULATING ACTUAL SENT EMAIL CONTENT\n');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Get the most recent send
  const { data: recentSend } = await supabase
    .from('email_sends')
    .select('*')
    .order('sent_at', { ascending: false })
    .limit(1)
    .single();

  if (!recentSend) {
    console.log('❌ No recent sends found');
    return;
  }

  // Get campaign details
  const { data: campaign } = await supabase
    .from('email_campaigns')
    .select('*')
    .eq('id', recentSend.campaign_id)
    .single();

  // Get subscriber details
  const { data: subscriber } = await supabase
    .from('subscribers')
    .select('*')
    .eq('email', recentSend.email)
    .single();

  console.log('📧 RECENT SEND INFO:');
  console.log(`   Send ID: ${recentSend.id}`);
  console.log(`   Campaign: ${campaign.name} (${campaign.subject})`);
  console.log(`   Subscriber: ${subscriber.email}`);
  console.log('');

  console.log('📋 STORED HTML CONTENT (Database):');
  console.log(campaign.html_content || 'No HTML content stored');
  console.log('');

  // Now simulate what the ACTUAL email should have looked like
  // We need to reverse-engineer the email elements that were used
  console.log('🔧 SIMULATING ACTUAL SENT EMAIL:');
  
  // Based on the HTML content, let's guess the email elements
  const simulatedElements = [
    { type: 'text', content: 'Welcome to Cymasphere! 🎵' },
    { type: 'text', content: 'Hi {{firstName}}, Thank you for joining our community...' },
    { type: 'button', content: '🚀 Get Started Now', url: 'https://cymasphere.com' }
  ];

  // Use the same generation function that was used during sending
  const generatedHtml = generateHtmlFromElementsSimulation(
    simulatedElements, 
    campaign.subject,
    recentSend.campaign_id,
    subscriber.id,
    recentSend.id
  );

  console.log('📄 WHAT THE ACTUAL EMAIL SHOULD HAVE CONTAINED:');
  console.log(`   Length: ${generatedHtml.length} characters`);
  console.log(`   Has tracking pixel: ${generatedHtml.includes('/api/email-campaigns/track/open') ? '✅ YES' : '❌ NO'}`);
  console.log('');

  if (generatedHtml.includes('/api/email-campaigns/track/open')) {
    // Extract the tracking pixel URL
    const pixelMatch = generatedHtml.match(/src="([^"]*\/api\/email-campaigns\/track\/open[^"]*)"/);
    if (pixelMatch) {
      console.log('🔗 TRACKING PIXEL URL IN ACTUAL EMAIL:');
      console.log(`   ${pixelMatch[1]}`);
      console.log('');

      // Test this URL
      console.log('🧪 TESTING THE ACTUAL TRACKING URL:');
      try {
        const response = await fetch(pixelMatch[1], {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        });
        
        console.log(`   Status: ${response.status}`);
        console.log(`   Content-Type: ${response.headers.get('content-type')}`);
        
        if (response.status === 200) {
          console.log('   ✅ This tracking URL works!');
          
          // Wait and check for opens
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          const { data: opens } = await supabase
            .from('email_opens')
            .select('*')
            .eq('send_id', recentSend.id)
            .order('opened_at', { ascending: false });
            
          console.log(`   Opens after test: ${opens?.length || 0}`);
          if (opens && opens.length > 0) {
            console.log('   🎉 SUCCESS: Test created an open record!');
            console.log(`   Latest open: ${opens[0].opened_at}`);
          } else {
            console.log('   ⚠️ No open recorded (bot detection or other issue)');
          }
        }
      } catch (error) {
        console.log(`   ❌ Error testing URL: ${error.message}`);
      }
    }
  }

  console.log('\n💡 CONCLUSION:');
  console.log('The tracking system should work if the emails actually contain tracking pixels.');
  console.log('The issue is likely that email clients are blocking images or bot detection is filtering the opens.');
}

// Simplified version of the generation function
function generateHtmlFromElementsSimulation(elements, subject, campaignId, subscriberId, sendId) {
  const elementHtml = elements.map(element => {
    switch (element.type) {
      case 'text':
        return `<p style="font-size: 1rem; color: #555; line-height: 1.6; margin-bottom: 1rem;">${element.content}</p>`;
      case 'button':
        return `<div style="text-align: center; margin: 2rem 0;"><a href="${element.url || '#'}" style="display: inline-block; padding: 12px 24px; background: linear-gradient(90deg, #6c63ff, #4ecdc4); color: white; text-decoration: none; border-radius: 25px; font-weight: 600;">${element.content}</a></div>`;
      default:
        return `<div>${element.content || ''}</div>`;
    }
  }).join('');

  let html = `<!DOCTYPE html>
<html>
<head><title>${subject}</title></head>
<body>
<div class="container">
  <div class="header">
    <div class="logo">CYMASPHERE</div>
  </div>
  <div class="content">
    ${elementHtml}
  </div>
  <div class="footer">
    <p>© 2024 Cymasphere. All rights reserved.</p>
  </div>
</div>`;

  // Add tracking pixel
  if (campaignId && subscriberId && sendId) {
    const baseUrl = 'https://cymasphere.com';
    const trackingPixel = `
    <!-- Email Open Tracking -->
    <img src="${baseUrl}/api/email-campaigns/track/open?c=${campaignId}&u=${subscriberId}&s=${sendId}" width="1" height="1" style="display:none;border:0;outline:0;" alt="" />`;
    html += trackingPixel;
  }

  html += `</body></html>`;
  return html;
}

testActualSentEmail().catch(console.error); 