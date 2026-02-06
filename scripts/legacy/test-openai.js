/**
 * Test script to check OpenAI API access
 * Usage: node test-openai.js
 */

require('dotenv').config({ path: '.env.local' });
const OpenAI = require('openai');

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.error('❌ OPENAI_API_KEY not found in environment variables');
  process.exit(1);
}

console.log('🔍 Testing OpenAI API access...\n');
console.log(`API Key: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}\n`);

const openai = new OpenAI({
  apiKey: apiKey,
});

async function testOpenAI() {
  try {
    console.log('📤 Sending test request to OpenAI...\n');
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant.",
        },
        {
          role: "user",
          content: "Say 'Hello, OpenAI is working!' if you can read this.",
        },
      ],
      max_tokens: 50,
    });

    const response = completion.choices[0]?.message?.content;
    
    console.log('✅ OpenAI API is working!');
    console.log(`Response: ${response}\n`);
    
    // Check usage info if available
    if (completion.usage) {
      console.log('📊 Usage:');
      console.log(`   Prompt tokens: ${completion.usage.prompt_tokens}`);
      console.log(`   Completion tokens: ${completion.usage.completion_tokens}`);
      console.log(`   Total tokens: ${completion.usage.total_tokens}\n`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ OpenAI API Error:\n');
    
    if (error.status === 429) {
      console.error('   Status: 429 - Rate limit exceeded / Quota exceeded');
      console.error('   Message:', error.message);
      console.error('\n   💡 This means your OpenAI account has hit its usage limit.');
      console.error('   Check your OpenAI dashboard: https://platform.openai.com/usage');
    } else if (error.status === 401) {
      console.error('   Status: 401 - Unauthorized');
      console.error('   Message:', error.message);
      console.error('\n   💡 Your API key is invalid or expired.');
      console.error('   Check your API key at: https://platform.openai.com/api-keys');
    } else if (error.status === 500) {
      console.error('   Status: 500 - OpenAI server error');
      console.error('   Message:', error.message);
      console.error('\n   💡 This is an OpenAI server issue, try again later.');
    } else {
      console.error('   Status:', error.status || 'Unknown');
      console.error('   Message:', error.message);
      console.error('   Error:', error);
    }
    
    return false;
  }
}

testOpenAI()
  .then((success) => {
    if (success) {
      console.log('✅ Test completed successfully!');
      process.exit(0);
    } else {
      console.log('❌ Test failed!');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });


