/**
 * Check OpenAI API key project/organization info
 */
require('dotenv').config({ path: '.env.local' });
const OpenAI = require('openai');

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.error('❌ OPENAI_API_KEY not found');
  process.exit(1);
}

console.log('🔍 Checking OpenAI API key project information...\n');
console.log(`Key type: ${apiKey.startsWith('sk-proj-') ? 'Project-level key' : apiKey.startsWith('sk-') ? 'Account-level key' : 'Unknown format'}`);
console.log(`Key prefix: ${apiKey.substring(0, 20)}...\n`);

const openai = new OpenAI({ apiKey });

async function checkProject() {
  try {
    // Try to get subscription info
    console.log('📊 Checking billing/subscription info...\n');
    const response = await fetch('https://api.openai.com/v1/dashboard/billing/subscription', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Subscription info:');
      console.log(JSON.stringify(data, null, 2));
    } else {
      const error = await response.json();
      console.log('⚠️  Could not get subscription info:');
      console.log(JSON.stringify(error, null, 2));
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  try {
    // Test a simple API call to see what error we get
    console.log('\n🧪 Testing API call to identify project...\n');
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "test" }],
      max_tokens: 1,
    });
    console.log('✅ API call successful!');
  } catch (error) {
    console.log('❌ API call error:');
    console.log('Status:', error.status);
    console.log('Message:', error.message);
    console.log('Type:', error.type);
    console.log('Code:', error.code);
    
    if (error.response) {
      console.log('\nFull error response:');
      console.log(JSON.stringify(error.response, null, 2));
    }
  }
}

checkProject();

