#!/usr/bin/env node

/**
 * Quick Test Script for Scheduled Campaign System
 * 
 * This script provides a simple way to test the scheduled campaign system
 * without running the full comprehensive test suite.
 */

import fetch from "node-fetch";

// Configuration
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://cymasphere.com";
const CRON_SECRET = process.env.CRON_SECRET || "your-secret-key";

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
  console.log("🔍 Testing Scheduler Status...");
  
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
  
  const result = await testEndpoint(ENDPOINTS.awsCheck);
  
  if (result.success) {
    console.log("✅ AWS Configuration:");
    console.log(`   AWS Key: ${result.data.AWS_ACCESS_KEY_ID}`);
    console.log(`   AWS Secret: ${result.data.AWS_SECRET_ACCESS_KEY}`);
    console.log(`   AWS Region: ${result.data.AWS_REGION}`);
    console.log(`   CRON Secret: ${result.data.CRON_SECRET}`);
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

async function runQuickTests() {
  console.log("🚀 Quick Test Suite for Scheduled Campaign System");
  console.log("=" .repeat(50));
  
  const results = {
    scheduler: await testSchedulerStatus(),
    processScheduled: await testProcessScheduled(),
    awsConfig: await testAWSConfiguration(),
    unauthorized: await testUnauthorizedAccess(),
  };
  
  console.log("\n" + "=".repeat(50));
  console.log("📊 QUICK TEST RESULTS");
  console.log("=".repeat(50));
  
  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? "✅ PASS" : "❌ FAIL";
    console.log(`${status} ${test}`);
  });
  
  const passedCount = Object.values(results).filter(Boolean).length;
  const totalCount = Object.keys(results).length;
  const successRate = ((passedCount / totalCount) * 100).toFixed(1);
  
  console.log(`\n📈 Success Rate: ${successRate}% (${passedCount}/${totalCount})`);
  
  if (passedCount === totalCount) {
    console.log("\n🎉 All quick tests passed! Your scheduled campaign system appears to be working.");
  } else {
    console.log("\n⚠️ Some tests failed. Check the errors above and run the comprehensive test suite for detailed diagnostics.");
  }
  
  return passedCount === totalCount;
}

// Run the quick tests
runQuickTests()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error("💥 Quick test suite failed:", error);
    process.exit(1);
  });





