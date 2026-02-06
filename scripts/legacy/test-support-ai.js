// Test script to verify OpenAI connection for support tickets AI
const OpenAI = require('openai');
require('dotenv').config({ path: '.env.local' });

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

async function testConnection() {
  console.log('Testing OpenAI connection for support tickets AI...\n');
  
  if (!openai) {
    console.log('❌ OpenAI client not initialized - API key missing');
    console.log('OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);
    return;
  }
  
  console.log('✅ OpenAI client initialized');
  console.log('API Key prefix:', process.env.OPENAI_API_KEY?.substring(0, 10) + '...');
  console.log('\nAttempting API call...\n');
  
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a helpful support agent.",
        },
        {
          role: "user",
          content: "Say 'Connection successful' if you can read this.",
        },
      ],
      temperature: 0.7,
      max_tokens: 50,
    });

    const response = completion.choices[0]?.message?.content;
    console.log('✅ API call successful!');
    console.log('Response:', response);
    console.log('\nModel used:', completion.model);
    console.log('Tokens used:', completion.usage?.total_tokens);
  } catch (error) {
    console.log('❌ API call failed');
    console.log('Error status:', error.status);
    console.log('Error message:', error.message);
    
    if (error.status === 429) {
      console.log('\n⚠️  Quota exceeded - check your OpenAI billing');
    } else if (error.status === 401) {
      console.log('\n⚠️  Invalid API key - check your OPENAI_API_KEY');
    }
  }
}

testConnection();

