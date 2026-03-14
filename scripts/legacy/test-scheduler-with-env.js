#!/usr/bin/env node

/**
 * Test Script for Scheduled Campaign System with Environment Loading
 * 
 * This script loads environment variables and tests the scheduled campaign system.
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import fetch from "node-fetch";

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

// Configuration
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://nnaud.io";
const CRON_SECRET = process.env.CRON_SECRET || "your-secret-key";

console.log("🔧 Environment Check:");
console.log(`   SITE_URL: ${SITE_URL}`);
console.log(`   CRON_SECRET: ${CRON_SECRET ? `${CRON_SECRET.slice(0, 8)}...` : 'NOT_SET'}`);
console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'NOT_SET'}`);

const ENDPOINTS = {
  processScheduled: `${SITE_URL}/api/email-campaigns/process-scheduled`,
  scheduler: `${SITE_URL}/api/scheduler`,
  awsCheck: `${SITE_URL}/api/check-aws-env`,
};

async function testEndpoint(url, options = {}) {
  try {
    const response = await fetch(url, {
      method: "GET",
      ...options,
    });
    
    const data = await response.json();
    return { success: response.ok, status: response.status, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function testSchedulerStatus() {
  console.log("\n🔍 Testing Scheduler Status...");
  
  const result = await testEndpoint(ENDPOINTS.scheduler);
  
  if (result.success) {
    console.log("✅ Scheduler Status:");
    console.log(`   Enabled: ${result.data.isEnabled}`);
    console.log(`   Running: ${result.data.isRunning}`);
    console.log(`   Environment: ${result.data.environment}`);
    console.log(`   Cron: ${result.data.schedulerCron}`);
  } else {
    console.log("❌ Scheduler Status Failed:");
    console.log(`   Error: ${result.error || result.data?.error}`);
  }
  
  return result.success;
}

async function testProcessScheduled() {
  console.log("\n📧 Testing Process Scheduled Endpoint...");
  
  const result = await testEndpoint(ENDPOINTS.processScheduled, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${CRON_SECRET}`,
    },
  });
  
  if (result.success) {
    console.log("✅ Process Scheduled Response:");
    console.log(`   Processed: ${result.data.processed || 0}`);
    console.log(`   Message: ${result.data.message}`);
    
    if (result.data.recentlyProcessed) {
      console.log(`   Recent Campaigns: ${result.data.recentlyProcessed.length}`);
    }
  } else {
    console.log("❌ Process Scheduled Failed:");
    console.log(`   Status: ${result.status}`);
    console.log(`   Error: ${result.data?.error || result.error}`);
  }
  
  return result.success;
}

async function testAWSConfiguration() {
  console.log("\n☁️ Testing AWS Configuration...");
  
  const result = await testEndpoint(ENDPOINTS.awsCheck, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${CRON_SECRET}`,
    },
  });
  
  if (result.success) {
    console.log("✅ AWS Configuration:");
    console.log(`   AWS Key: ${result.data.environment?.AWS_ACCESS_KEY_ID || 'NOT_SET'}`);
    console.log(`   AWS Secret: ${result.data.environment?.AWS_SECRET_ACCESS_KEY || 'NOT_SET'}`);
    console.log(`   AWS Region: ${result.data.environment?.AWS_REGION || 'NOT_SET'}`);
    console.log(`   CRON Secret: ${result.data.environment?.CRON_SECRET || 'NOT_SET'}`);
  } else {
    console.log("❌ AWS Configuration Failed:");
    console.log(`   Error: ${result.error || result.data?.error}`);
  }
  
  return result.success;
}

async function testUnauthorizedAccess() {
  console.log("\n🔐 Testing Unauthorized Access...");
  
  const result = await testEndpoint(ENDPOINTS.processScheduled, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // No Authorization header
    },
  });
  
  const expectedUnauthorized = result.status === 401;
  
  if (expectedUnauthorized) {
    console.log("✅ Unauthorized access properly rejected");
  } else {
    console.log("❌ Unauthorized access not properly rejected:");
    console.log(`   Status: ${result.status}`);
    console.log(`   Response: ${JSON.stringify(result.data)}`);
  }
  
  return expectedUnauthorized;
}

async function runTests() {
  console.log("🚀 Testing Scheduled Campaign System with Environment Variables");
  console.log("=" .repeat(60));
  
  const results = {
    scheduler: await testSchedulerStatus(),
    processScheduled: await testProcessScheduled(),
    awsConfig: await testAWSConfiguration(),
    unauthorized: await testUnauthorizedAccess(),
  };
  
  console.log("\n" + "=".repeat(60));
  console.log("📊 TEST RESULTS");
  console.log("=".repeat(60));
  
  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? "✅ PASS" : "❌ FAIL";
    console.log(`${status} ${test}`);
  });
  
  const passedCount = Object.values(results).filter(Boolean).length;
  const totalCount = Object.keys(results).length;
  const successRate = ((passedCount / totalCount) * 100).toFixed(1);
  
  console.log(`\n📈 Success Rate: ${successRate}% (${passedCount}/${totalCount})`);
  
  if (passedCount === totalCount) {
    console.log("\n🎉 All tests passed! Your scheduled campaign system is working correctly.");
  } else {
    console.log("\n⚠️ Some tests failed. Check the errors above for troubleshooting.");
  }
  
  return passedCount === totalCount;
}

// Run the tests
runTests()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error("💥 Test failed:", error);
    process.exit(1);
  });
