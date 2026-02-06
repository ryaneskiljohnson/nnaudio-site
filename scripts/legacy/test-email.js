// Simple script to test email sending with the updated configuration
require('dotenv').config({ path: '.env.local' });
const { SESClient, GetSendQuotaCommand } = require('@aws-sdk/client-ses');
const { STSClient, GetCallerIdentityCommand } = require('@aws-sdk/client-sts');

async function main() {
  try {
    // Get the AWS credentials from environment
    const credentials = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
    };
    
    const region = process.env.AWS_REGION || 'us-east-1';
    
    // Create STS client to get account info
    const stsClient = new STSClient({
      region,
      credentials
    });
    
    // Get account identity
    const identityCommand = new GetCallerIdentityCommand({});
    const identityResult = await stsClient.send(identityCommand);
    
    console.log('Successfully connected to AWS using environment variables');
    console.log('Account ID:', identityResult.Account);
    
    // Create SES client with environment variables
    const sesClient = new SESClient({
      region,
      credentials
    });

    // Get account quota to verify credentials
    const quotaCommand = new GetSendQuotaCommand({});
    const quotaResult = await sesClient.send(quotaCommand);
    
    console.log('\nSES Details:');
    console.log('- Max 24 Hour Send:', quotaResult.Max24HourSend);
    console.log('- Max Send Rate:', quotaResult.MaxSendRate);
    console.log('- Sent Last 24 Hours:', quotaResult.SentLast24Hours);
    
    console.log('\nEnvironment variables used:');
    console.log('- AWS_REGION:', process.env.AWS_REGION);
    console.log('- AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? '[Set]' : '[Not set]');
    console.log('- AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? '[Set]' : '[Not set]');
  } catch (error) {
    console.error('Error testing AWS connection:', error);
  }
}

main(); 