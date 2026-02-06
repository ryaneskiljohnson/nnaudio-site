// Check SES status using the same AWS SDK configuration as the email utility
const { SESClient, GetAccountSendingEnabledCommand, ListIdentitiesCommand, GetSendQuotaCommand } = require("@aws-sdk/client-ses");

async function checkSESStatus() {
  console.log('🔍 Checking AWS SES Status...\n');
  
  try {
    // Use the same configuration as the email utility
    const sesClient = new SESClient({ 
      region: process.env.AWS_REGION || "us-east-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
      }
    });

    console.log('📋 Configuration:');
    console.log(`   Region: ${process.env.AWS_REGION || "us-east-1"}`);
    console.log(`   Access Key: ${process.env.AWS_ACCESS_KEY_ID ? process.env.AWS_ACCESS_KEY_ID.substring(0, 8) + '...' : 'NOT SET'}`);
    console.log(`   Secret Key: ${process.env.AWS_SECRET_ACCESS_KEY ? 'SET (' + process.env.AWS_SECRET_ACCESS_KEY.length + ' chars)' : 'NOT SET'}\n`);

    // Check if sending is enabled
    console.log('🚀 Checking account sending status...');
    const sendingEnabled = await sesClient.send(new GetAccountSendingEnabledCommand({}));
    console.log(`   Sending enabled: ${sendingEnabled.Enabled ? '✅ YES' : '❌ NO'}\n`);

    // Check send quota
    console.log('📊 Checking send quota...');
    const quota = await sesClient.send(new GetSendQuotaCommand({}));
    console.log(`   Max 24 hour send: ${quota.Max24HourSend}`);
    console.log(`   Max send rate: ${quota.MaxSendRate} emails/second`);
    console.log(`   Sent last 24h: ${quota.SentLast24Hours}\n`);

    // List verified identities
    console.log('📧 Checking verified email identities...');
    const identities = await sesClient.send(new ListIdentitiesCommand({
      IdentityType: 'EmailAddress',
      MaxItems: 50
    }));
    
    if (identities.Identities && identities.Identities.length > 0) {
      console.log(`   Found ${identities.Identities.length} verified email(s):`);
      identities.Identities.forEach((email, i) => {
        const isRyan = email === 'ryan@cymasphere.com';
        const isSupport = email === 'support@cymasphere.com';
        console.log(`   ${i + 1}. ${email} ${isRyan ? '👤 (YOUR EMAIL)' : isSupport ? '🏢 (SENDER)' : ''}`);
      });
      
      // Check specific emails
      const hasRyan = identities.Identities.includes('ryan@cymasphere.com');
      const hasSupport = identities.Identities.includes('support@cymasphere.com');
      
      console.log('\n🔍 Email Verification Status:');
      console.log(`   ryan@cymasphere.com: ${hasRyan ? '✅ VERIFIED' : '❌ NOT VERIFIED'}`);
      console.log(`   support@cymasphere.com: ${hasSupport ? '✅ VERIFIED' : '❌ NOT VERIFIED'}`);
      
      if (!hasRyan) {
        console.log('\n⚠️  ISSUE: ryan@cymasphere.com is not verified!');
        console.log('   In SES sandbox mode, recipient emails must be verified.');
        console.log('   To verify: aws ses verify-email-identity --email-address ryan@cymasphere.com');
      }
      
      if (!hasSupport) {
        console.log('\n⚠️  ISSUE: support@cymasphere.com is not verified!');
        console.log('   The sender email must be verified.');
        console.log('   To verify: aws ses verify-email-identity --email-address support@cymasphere.com');
      }
      
    } else {
      console.log('   ❌ No verified email addresses found!');
      console.log('   You need to verify both sender and recipient emails.');
      console.log('   Run: aws ses verify-email-identity --email-address ryan@cymasphere.com');
      console.log('   Run: aws ses verify-email-identity --email-address support@cymasphere.com');
    }

  } catch (error) {
    console.error('\n❌ Error checking SES status:', error.message);
    
    if (error.message.includes('security token')) {
      console.error('\n🔧 Possible fixes:');
      console.error('   1. Check AWS credentials in .env.local');
      console.error('   2. Ensure AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are correct');
      console.error('   3. Check if credentials have SES permissions');
    } else if (error.message.includes('region')) {
      console.error('\n🔧 Possible fixes:');
      console.error('   1. Check AWS_REGION in .env.local');
      console.error('   2. Ensure SES is enabled in your region');
    }
  }
}

// Load environment variables
require('dotenv').config({ path: '.env.local' });

// Run the check
checkSESStatus().catch(console.error); 