/**
 * Test script to validate iOS receipts directly with Apple
 * Run with: node test-receipt-validation.js <receipt-data-base64>
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env.local') });

async function testReceiptValidation(receiptData) {
  console.log('=== Testing Receipt Validation with Apple ===\n');
  console.log('Receipt data length:', receiptData.length);
  console.log('Receipt preview:', receiptData.substring(0, 100) + '...\n');

  const sharedSecret = process.env.APPLE_SHARED_SECRET;
  console.log('Shared secret available:', !!sharedSecret);
  console.log('Shared secret length:', sharedSecret?.length || 0);
  console.log('');

  // Test 1: Sandbox WITHOUT shared secret
  console.log('--- Test 1: Sandbox WITHOUT shared secret ---');
  try {
    const body1 = {
      'receipt-data': receiptData,
      'exclude-old-transactions': false,
    };
    
    const response1 = await fetch('https://sandbox.itunes.apple.com/verifyReceipt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body1),
    });
    
    const result1 = await response1.json();
    console.log('Status:', result1.status);
    console.log('Environment:', result1.environment);
    console.log('Full response:', JSON.stringify(result1, null, 2));
    console.log('');
    
    if (result1.status === 0) {
      console.log('✅ SUCCESS: Receipt validated without shared secret!');
      if (result1.receipt && result1.receipt.in_app) {
        console.log('In-app purchases found:', result1.receipt.in_app.length);
        result1.receipt.in_app.forEach((purchase, i) => {
          console.log(`  Purchase ${i + 1}:`, {
            product_id: purchase.product_id,
            transaction_id: purchase.transaction_id,
            purchase_date: purchase.purchase_date_ms ? new Date(parseInt(purchase.purchase_date_ms)).toISOString() : 'N/A',
          });
        });
      }
      if (result1.latest_receipt_info) {
        console.log('Latest receipt info:', result1.latest_receipt_info.length, 'items');
        result1.latest_receipt_info.forEach((item, i) => {
          console.log(`  Item ${i + 1}:`, {
            product_id: item.product_id,
            transaction_id: item.transaction_id,
            expires_date: item.expires_date_ms ? new Date(parseInt(item.expires_date_ms)).toISOString() : 'N/A',
            is_trial_period: item.is_trial_period,
            is_in_intro_offer_period: item.is_in_intro_offer_period,
          });
        });
      }
      return;
    }
  } catch (error) {
    console.error('Error:', error.message);
    console.log('');
  }

  // Test 2: Sandbox WITH shared secret (if available)
  if (sharedSecret) {
    console.log('--- Test 2: Sandbox WITH shared secret ---');
    try {
      const body2 = {
        'receipt-data': receiptData,
        'password': sharedSecret,
        'exclude-old-transactions': false,
      };
      
      const response2 = await fetch('https://sandbox.itunes.apple.com/verifyReceipt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body2),
      });
      
      const result2 = await response2.json();
      console.log('Status:', result2.status);
      console.log('Environment:', result2.environment);
      console.log('Full response:', JSON.stringify(result2, null, 2));
      console.log('');
      
      if (result2.status === 0) {
        console.log('✅ SUCCESS: Receipt validated with shared secret!');
        if (result2.receipt && result2.receipt.in_app) {
          console.log('In-app purchases found:', result2.receipt.in_app.length);
        }
        if (result2.latest_receipt_info) {
          console.log('Latest receipt info:', result2.latest_receipt_info.length, 'items');
        }
        return;
      }
    } catch (error) {
      console.error('Error:', error.message);
      console.log('');
    }
  }

  // Test 3: Production (just to see what happens)
  console.log('--- Test 3: Production (should fail if sandbox receipt) ---');
  try {
    const body3 = {
      'receipt-data': receiptData,
      'exclude-old-transactions': false,
    };
    
    if (sharedSecret) {
      body3.password = sharedSecret;
    }
    
    const response3 = await fetch('https://buy.itunes.apple.com/verifyReceipt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body3),
    });
    
    const result3 = await response3.json();
    console.log('Status:', result3.status);
    console.log('Environment:', result3.environment);
    console.log('Note: Status 21007 means receipt is from sandbox but sent to production (expected)');
    console.log('');
  } catch (error) {
    console.error('Error:', error.message);
  }

  console.log('=== Test Complete ===');
}

// Get receipt data from command line or read from file
const receiptArg = process.argv[2];

if (!receiptArg) {
  console.error('Usage: node test-receipt-validation.js <receipt-data-base64>');
  console.error('Or: node test-receipt-validation.js <path-to-receipt-file>');
  process.exit(1);
}

let receiptData;

// Check if it's a file path
if (fs.existsSync(receiptArg)) {
  console.log('Reading receipt from file:', receiptArg);
  receiptData = fs.readFileSync(receiptArg, 'utf8').trim();
} else {
  // Assume it's the base64 data directly
  receiptData = receiptArg;
}

testReceiptValidation(receiptData).catch(console.error);

