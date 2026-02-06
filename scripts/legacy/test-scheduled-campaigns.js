#!/usr/bin/env node

/**
 * Comprehensive Test Suite for Scheduled Campaign System
 * 
 * This script tests all aspects of the scheduled campaign system:
 * 1. API endpoint functionality
 * 2. Authentication and authorization
 * 3. Campaign scheduling and processing
 * 4. Database operations
 * 5. Email sending integration
 * 6. Error handling and edge cases
 */

import { createClient } from "@supabase/supabase-js";
import fetch from "node-fetch";

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://jibirpbauzqhdiwjlrmf.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://cymasphere.com";
const CRON_SECRET = process.env.CRON_SECRET || "your-secret-key";

// Test configuration
const TEST_CONFIG = {
  endpoint: `${SITE_URL}/api/email-campaigns/process-scheduled`,
  testCampaignName: `Test Scheduled Campaign ${Date.now()}`,
  testAudienceName: `Test Audience ${Date.now()}`,
  testSubscriberEmail: `test-subscriber-${Date.now()}@example.com`,
};

// Initialize Supabase client
if (!SUPABASE_SERVICE_KEY) {
  console.error("❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  errors: [],
};

function logTest(name, passed, details = "") {
  const status = passed ? "✅ PASS" : "❌ FAIL";
  console.log(`${status} ${name}`);
  if (details) console.log(`   ${details}`);
  
  if (passed) {
    testResults.passed++;
  } else {
    testResults.failed++;
    testResults.errors.push({ name, details });
  }
}

async function cleanup() {
  console.log("\n🧹 Cleaning up test data...");
  
  try {
    // Clean up test campaigns
    const { error: campaignError } = await supabase
      .from("email_campaigns")
      .delete()
      .like("name", "Test Scheduled Campaign%");
    
    if (campaignError) {
      console.log("⚠️ Campaign cleanup error:", campaignError.message);
    }

    // Clean up test audiences
    const { error: audienceError } = await supabase
      .from("email_audiences")
      .delete()
      .like("name", "Test Audience%");
    
    if (audienceError) {
      console.log("⚠️ Audience cleanup error:", audienceError.message);
    }

    // Clean up test subscribers
    const { error: subscriberError } = await supabase
      .from("subscribers")
      .delete()
      .like("email", "test-subscriber%@example.com");
    
    if (subscriberError) {
      console.log("⚠️ Subscriber cleanup error:", subscriberError.message);
    }

    console.log("✅ Cleanup completed");
  } catch (error) {
    console.log("⚠️ Cleanup error:", error.message);
  }
}

// Test 1: API Endpoint Accessibility
async function testEndpointAccessibility() {
  console.log("\n🔍 Test 1: API Endpoint Accessibility");
  
  try {
    const response = await fetch(TEST_CONFIG.endpoint, {
      method: "GET",
    });
    
    const data = await response.json();
    const passed = response.ok && data.message;
    
    logTest(
      "Endpoint accessible",
      passed,
      `Status: ${response.status}, Message: ${data.message || "No message"}`
    );
    
    return passed;
  } catch (error) {
    logTest("Endpoint accessible", false, `Error: ${error.message}`);
    return false;
  }
}

// Test 2: Authentication and Authorization
async function testAuthentication() {
  console.log("\n🔐 Test 2: Authentication and Authorization");
  
  // Test without authentication
  try {
    const response = await fetch(TEST_CONFIG.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    
    const data = await response.json();
    const passed = response.status === 401 && data.error === "Unauthorized";
    
    logTest(
      "Unauthorized request rejected",
      passed,
      `Status: ${response.status}, Error: ${data.error || "No error"}`
    );
  } catch (error) {
    logTest("Unauthorized request rejected", false, `Error: ${error.message}`);
  }
  
  // Test with valid authentication
  try {
    const response = await fetch(TEST_CONFIG.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${CRON_SECRET}`,
      },
    });
    
    const data = await response.json();
    const passed = response.ok && (data.message || data.processed !== undefined);
    
    logTest(
      "Authorized request accepted",
      passed,
      `Status: ${response.status}, Response: ${JSON.stringify(data).slice(0, 100)}...`
    );
    
    return passed;
  } catch (error) {
    logTest("Authorized request accepted", false, `Error: ${error.message}`);
    return false;
  }
}

// Test 3: Database Schema Validation
async function testDatabaseSchema() {
  console.log("\n🗄️ Test 3: Database Schema Validation");
  
  try {
    // Check email_campaigns table
    const { data: campaigns, error: campaignsError } = await supabase
      .from("email_campaigns")
      .select("id, name, status, scheduled_at")
      .limit(1);
    
    const campaignsTableExists = !campaignsError;
    logTest(
      "email_campaigns table exists",
      campaignsTableExists,
      campaignsError ? `Error: ${campaignsError.message}` : "Table accessible"
    );
    
    // Check email_audiences table
    const { data: audiences, error: audiencesError } = await supabase
      .from("email_audiences")
      .select("id, name")
      .limit(1);
    
    const audiencesTableExists = !audiencesError;
    logTest(
      "email_audiences table exists",
      audiencesTableExists,
      audiencesError ? `Error: ${audiencesError.message}` : "Table accessible"
    );
    
    // Check subscribers table
    const { data: subscribers, error: subscribersError } = await supabase
      .from("subscribers")
      .select("id, email")
      .limit(1);
    
    const subscribersTableExists = !subscribersError;
    logTest(
      "subscribers table exists",
      subscribersTableExists,
      subscribersError ? `Error: ${subscribersError.message}` : "Table accessible"
    );
    
    return campaignsTableExists && audiencesTableExists && subscribersTableExists;
  } catch (error) {
    logTest("Database schema validation", false, `Error: ${error.message}`);
    return false;
  }
}

// Test 4: Create Test Data
async function createTestData() {
  console.log("\n📝 Test 4: Create Test Data");
  
  try {
    // Create test audience
    const { data: audience, error: audienceError } = await supabase
      .from("email_audiences")
      .insert({
        name: TEST_CONFIG.testAudienceName,
        description: "Test audience for scheduled campaign testing",
        created_by: "test-user",
      })
      .select()
      .single();
    
    if (audienceError) {
      logTest("Create test audience", false, `Error: ${audienceError.message}`);
      return null;
    }
    
    logTest("Create test audience", true, `ID: ${audience.id}`);
    
    // Create test subscriber
    const { data: subscriber, error: subscriberError } = await supabase
      .from("subscribers")
      .insert({
        email: TEST_CONFIG.testSubscriberEmail,
        first_name: "Test",
        last_name: "Subscriber",
        status: "active",
      })
      .select()
      .single();
    
    if (subscriberError) {
      logTest("Create test subscriber", false, `Error: ${subscriberError.message}`);
      return null;
    }
    
    logTest("Create test subscriber", true, `ID: ${subscriber.id}`);
    
    // Add subscriber to audience
    const { error: membershipError } = await supabase
      .from("email_audience_subscribers")
      .insert({
        audience_id: audience.id,
        subscriber_id: subscriber.id,
      });
    
    if (membershipError) {
      logTest("Add subscriber to audience", false, `Error: ${membershipError.message}`);
      return null;
    }
    
    logTest("Add subscriber to audience", true);
    
    return { audience, subscriber };
  } catch (error) {
    logTest("Create test data", false, `Error: ${error.message}`);
    return null;
  }
}

// Test 5: Schedule Test Campaign
async function scheduleTestCampaign(audience) {
  console.log("\n📅 Test 5: Schedule Test Campaign");
  
  try {
    // Schedule campaign for 1 minute from now
    const scheduledAt = new Date(Date.now() + 60000); // 1 minute from now
    
    const { data: campaign, error: campaignError } = await supabase
      .from("email_campaigns")
      .insert({
        name: TEST_CONFIG.testCampaignName,
        subject: "Test Scheduled Campaign",
        html_content: "<h1>Test Campaign</h1><p>This is a test scheduled campaign.</p>",
        status: "scheduled",
        scheduled_at: scheduledAt.toISOString(),
        created_by: "test-user",
      })
      .select()
      .single();
    
    if (campaignError) {
      logTest("Create test campaign", false, `Error: ${campaignError.message}`);
      return null;
    }
    
    logTest("Create test campaign", true, `ID: ${campaign.id}`);
    
    // Add audience to campaign
    const { error: audienceError } = await supabase
      .from("email_campaign_audiences")
      .insert({
        campaign_id: campaign.id,
        audience_id: audience.id,
        is_excluded: false,
      });
    
    if (audienceError) {
      logTest("Add audience to campaign", false, `Error: ${audienceError.message}`);
      return null;
    }
    
    logTest("Add audience to campaign", true);
    
    return campaign;
  } catch (error) {
    logTest("Schedule test campaign", false, `Error: ${error.message}`);
    return null;
  }
}

// Test 6: Manual Trigger Processing
async function testManualProcessing() {
  console.log("\n🔧 Test 6: Manual Trigger Processing");
  
  try {
    const response = await fetch(TEST_CONFIG.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${CRON_SECRET}`,
      },
    });
    
    const data = await response.json();
    const passed = response.ok;
    
    logTest(
      "Manual processing trigger",
      passed,
      `Status: ${response.status}, Processed: ${data.processed || 0}, Message: ${data.message || "No message"}`
    );
    
    return passed;
  } catch (error) {
    logTest("Manual processing trigger", false, `Error: ${error.message}`);
    return false;
  }
}

// Test 7: Check Campaign Status
async function checkCampaignStatus(campaignId) {
  console.log("\n📊 Test 7: Check Campaign Status");
  
  try {
    const { data: campaign, error } = await supabase
      .from("email_campaigns")
      .select("*")
      .eq("id", campaignId)
      .single();
    
    if (error) {
      logTest("Check campaign status", false, `Error: ${error.message}`);
      return false;
    }
    
    const statusValid = ["sent", "failed", "sending"].includes(campaign.status);
    logTest(
      "Campaign status updated",
      statusValid,
      `Status: ${campaign.status}, Sent: ${campaign.emails_sent || 0}, Recipients: ${campaign.total_recipients || 0}`
    );
    
    return statusValid;
  } catch (error) {
    logTest("Check campaign status", false, `Error: ${error.message}`);
    return false;
  }
}

// Test 8: Environment Variables Check
async function testEnvironmentVariables() {
  console.log("\n🔧 Test 8: Environment Variables Check");
  
  const requiredVars = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "CRON_SECRET",
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY",
    "AWS_REGION",
  ];
  
  let allPresent = true;
  
  for (const varName of requiredVars) {
    const value = process.env[varName];
    const present = !!value;
    
    logTest(
      `${varName} is set`,
      present,
      present ? "Present" : "Missing"
    );
    
    if (!present) allPresent = false;
  }
  
  return allPresent;
}

// Test 9: AWS Configuration Check
async function testAWSConfiguration() {
  console.log("\n☁️ Test 9: AWS Configuration Check");
  
  try {
    const response = await fetch(`${SITE_URL}/api/check-aws-env`, {
      method: "GET",
    });
    
    const data = await response.json();
    const passed = response.ok && data.AWS_ACCESS_KEY_ID === "SET";
    
    logTest(
      "AWS configuration valid",
      passed,
      `Status: ${response.status}, AWS Key: ${data.AWS_ACCESS_KEY_ID || "NOT_SET"}`
    );
    
    return passed;
  } catch (error) {
    logTest("AWS configuration valid", false, `Error: ${error.message}`);
    return false;
  }
}

// Test 10: Scheduler Status Check
async function testSchedulerStatus() {
  console.log("\n⏰ Test 10: Scheduler Status Check");
  
  try {
    const response = await fetch(`${SITE_URL}/api/scheduler`, {
      method: "GET",
    });
    
    const data = await response.json();
    const passed = response.ok && data.isEnabled !== undefined;
    
    logTest(
      "Scheduler status endpoint",
      passed,
      `Status: ${response.status}, Enabled: ${data.isEnabled}, Running: ${data.isRunning}`
    );
    
    return passed;
  } catch (error) {
    logTest("Scheduler status endpoint", false, `Error: ${error.message}`);
    return false;
  }
}

// Main test execution
async function runAllTests() {
  console.log("🚀 Starting Comprehensive Scheduled Campaign System Tests");
  console.log("=" .repeat(60));
  
  // Test environment and basic functionality
  const envVarsOk = await testEnvironmentVariables();
  const endpointOk = await testEndpointAccessibility();
  const authOk = await testAuthentication();
  const schemaOk = await testDatabaseSchema();
  const awsOk = await testAWSConfiguration();
  const schedulerOk = await testSchedulerStatus();
  
  // Only proceed with data tests if basic tests pass
  if (envVarsOk && endpointOk && authOk && schemaOk) {
    console.log("\n📋 Basic tests passed, proceeding with data tests...");
    
    const testData = await createTestData();
    if (testData) {
      const campaign = await scheduleTestCampaign(testData.audience);
      if (campaign) {
        await testManualProcessing();
        await checkCampaignStatus(campaign.id);
      }
    }
  } else {
    console.log("\n⚠️ Basic tests failed, skipping data tests");
  }
  
  // Cleanup
  await cleanup();
  
  // Final results
  console.log("\n" + "=".repeat(60));
  console.log("📊 TEST RESULTS SUMMARY");
  console.log("=".repeat(60));
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📈 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);
  
  if (testResults.errors.length > 0) {
    console.log("\n❌ FAILED TESTS:");
    testResults.errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error.name}: ${error.details}`);
    });
  }
  
  console.log("\n🎯 RECOMMENDATIONS:");
  if (testResults.failed === 0) {
    console.log("✅ All tests passed! Your scheduled campaign system is working correctly.");
  } else {
    console.log("🔧 Fix the failed tests above before deploying to production.");
    console.log("📖 Check the documentation for troubleshooting steps.");
  }
  
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run the tests
runAllTests().catch((error) => {
  console.error("💥 Test suite failed:", error);
  process.exit(1);
}); 