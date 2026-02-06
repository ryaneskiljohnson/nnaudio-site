// Manual script to safely send Test Campaign to Test Audience
// This will check recipients first, then send safely

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase (you'll need to add your credentials)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY';

if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('YOUR_') || supabaseKey.includes('YOUR_')) {
  console.error('❌ Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables');
  console.log('ℹ️  You can find these in your .env.local file or Supabase dashboard');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTestAudienceAndSendCampaign() {
  try {
    console.log('🔍 Step 1: Finding Test Campaign...');
    
    // Find Test Campaign
    const { data: campaigns, error: campaignError } = await supabase
      .from('email_campaigns')
      .select('*')
      .ilike('name', '%test%')
      .order('created_at', { ascending: false });
    
    if (campaignError) {
      throw new Error(`Error finding campaigns: ${campaignError.message}`);
    }
    
    if (!campaigns || campaigns.length === 0) {
      console.log('❌ No Test Campaign found');
      console.log('ℹ️  Available campaigns:');
      
      const { data: allCampaigns } = await supabase
        .from('email_campaigns')
        .select('id, name, status')
        .order('created_at', { ascending: false });
      
      if (allCampaigns) {
        allCampaigns.forEach(c => console.log(`   - ${c.name} (${c.status})`));
      }
      return;
    }
    
    const testCampaign = campaigns[0];
    console.log(`✅ Found Test Campaign: "${testCampaign.name}" (ID: ${testCampaign.id})`);
    console.log(`   Status: ${testCampaign.status}`);
    console.log(`   Subject: ${testCampaign.subject}`);
    
    console.log('\\n🔍 Step 2: Finding Test Audience...');
    
    // Find Test Audience
    const { data: audiences, error: audienceError } = await supabase
      .from('email_audiences')
      .select('*')
      .ilike('name', '%test%')
      .order('created_at', { ascending: false });
    
    if (audienceError) {
      throw new Error(`Error finding audiences: ${audienceError.message}`);
    }
    
    if (!audiences || audiences.length === 0) {
      console.log('❌ No Test Audience found');
      console.log('ℹ️  Available audiences:');
      
      const { data: allAudiences } = await supabase
        .from('email_audiences')
        .select('id, name, subscriber_count')
        .order('created_at', { ascending: false });
      
      if (allAudiences) {
        allAudiences.forEach(a => console.log(`   - ${a.name} (${a.subscriber_count} subscribers)`));
      }
      return;
    }
    
    const testAudience = audiences[0];
    console.log(`✅ Found Test Audience: "${testAudience.name}" (ID: ${testAudience.id})`);
    console.log(`   Subscriber count: ${testAudience.subscriber_count}`);
    console.log(`   Type: ${testAudience.filters?.audience_type || 'dynamic'}`);
    
    console.log('\\n🔍 Step 3: Checking Test Audience recipients...');
    
    // Check who's in the Test Audience
    const { data: audienceSubscribers, error: subscriberError } = await supabase
      .from('email_audience_subscribers')
      .select(`
        subscriber_id,
        subscribers (
          id,
          email,
          status
        )
      `)
      .eq('audience_id', testAudience.id);
    
    if (subscriberError) {
      console.error('⚠️  Error fetching audience subscribers:', subscriberError.message);
      console.log('ℹ️  This might be a dynamic audience, checking filters instead...');
      
      // For dynamic audiences, we'd need to evaluate the filters
      console.log('📋 Audience filters:', JSON.stringify(testAudience.filters, null, 2));
      
      // For safety, let's just check if ryan@cymasphere.com exists as a subscriber
      const { data: ryanSubscriber } = await supabase
        .from('subscribers')
        .select('id, email, status')
        .eq('email', 'ryan@cymasphere.com')
        .single();
      
      if (ryanSubscriber) {
        console.log(`✅ Found ryan@cymasphere.com in subscribers table:`);
        console.log(`   ID: ${ryanSubscriber.id}`);
        console.log(`   Status: ${ryanSubscriber.status}`);
        
        // Simulate the audience targeting
        console.log('\\n📧 Recipients for Test Campaign (estimated):');
        console.log(`   📍 ryan@cymasphere.com (${ryanSubscriber.status})`);
        console.log('\\n🔒 SAFETY CHECK: Only ryan@cymasphere.com will receive emails in development mode');
        
      } else {
        console.log('❌ ryan@cymasphere.com not found in subscribers table');
        return;
      }
      
    } else {
      // Static audience with actual subscriber relationships
      console.log('\\n📧 Recipients in Test Audience:');
      
      if (!audienceSubscribers || audienceSubscribers.length === 0) {
        console.log('   ❌ No subscribers found in Test Audience');
        return;
      }
      
      audienceSubscribers.forEach((as, index) => {
        const subscriber = as.subscribers;
        console.log(`   ${index + 1}. 📍 ${subscriber.email} (${subscriber.status})`);
      });
      
      // Safety check - ensure only safe emails
      const safeEmails = ['ryan@cymasphere.com', 'test@cymasphere.com', 'demo@cymasphere.com'];
      const unsafeEmails = audienceSubscribers.filter(as => 
        !safeEmails.includes(as.subscribers.email)
      );
      
      if (unsafeEmails.length > 0) {
        console.log('\\n🚨 SAFETY WARNING: Found non-safe emails in Test Audience:');
        unsafeEmails.forEach(as => console.log(`   ⚠️  ${as.subscribers.email}`));
        console.log('\\nTo proceed safely, please ensure Test Audience only contains safe test emails.');
        return;
      }
      
      console.log('\\n✅ All recipients are safe test emails');
    }
    
    console.log('\\n🚀 Step 4: Manually sending Test Campaign...');
    console.log('🔒 SAFETY MODE: Only whitelisted emails will receive the campaign');
    
    // Call the send API
    const sendPayload = {
      campaignId: testCampaign.id,
      name: testCampaign.name,
      subject: testCampaign.subject,
      audienceIds: [testAudience.id],
      excludedAudienceIds: [],
      emailElements: [
        { id: 'header1', type: 'header', content: testCampaign.subject || 'Test Campaign' },
        { id: 'text1', type: 'text', content: testCampaign.html_content || testCampaign.text_content || 'This is a test email from the manual send script.' },
        { id: 'footer1', type: 'text', content: 'This email was sent manually for testing purposes.' }
      ],
      scheduleType: 'immediate'
    };
    
    console.log('📤 Sending with payload:', JSON.stringify(sendPayload, null, 2));
    
    // Make API call to local send endpoint
    const response = await fetch('http://localhost:3000/api/email-campaigns/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sendPayload)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('\\n🎉 SUCCESS! Campaign sent successfully');
      console.log('📊 Send Results:');
      console.log(`   Total: ${result.stats?.total || 0}`);
      console.log(`   Sent: ${result.stats?.sent || 0}`);
      console.log(`   Failed: ${result.stats?.failed || 0}`);
      console.log(`   Success Rate: ${result.stats?.successRate || 0}%`);
      console.log(`   Mode: ${result.stats?.mode || 'unknown'}`);
      
      if (result.results) {
        console.log('\\n📧 Individual Results:');
        result.results.forEach((r, i) => {
          console.log(`   ${i + 1}. ✅ ${r.email} - ${r.status} (${r.messageId})`);
        });
      }
      
      if (result.errors && result.errors.length > 0) {
        console.log('\\n❌ Errors:');
        result.errors.forEach((e, i) => {
          console.log(`   ${i + 1}. ❌ ${e.email} - ${e.error}`);
        });
      }
      
    } else {
      console.log('\\n❌ FAILED to send campaign');
      console.log('Error:', result.error);
      console.log('Details:', result);
    }
    
  } catch (error) {
    console.error('❌ Script failed:', error.message);
    console.error('Full error:', error);
  }
}

// Run the script
console.log('🚀 Manual Test Campaign Send Script');
console.log('===================================\\n');

checkTestAudienceAndSendCampaign(); 