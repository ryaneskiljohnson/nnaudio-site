#!/usr/bin/env node

/**
 * Debug Script for Scheduled Campaign System
 * 
 * This script helps identify specific issues with the scheduled campaign system
 * by providing detailed diagnostics and troubleshooting steps.
 */

import { createClient } from "@supabase/supabase-js";
import fetch from "node-fetch";
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://jibirpbauzqhdiwjlrmf.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://cymasphere.com";
const CRON_SECRET = process.env.CRON_SECRET || "your-secret-key";

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

async function checkEnvironmentVariables() {
  console.log("🔧 Environment Variables Check");
  console.log("-".repeat(40));
  
  const requiredVars = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "CRON_SECRET",
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY",
    "AWS_REGION",
    "NEXT_PUBLIC_SITE_URL",
  ];
  
  let allPresent = true;
  
  for (const varName of requiredVars) {
    const value = process.env[varName];
    const present = !!value;
    const maskedValue = present ? `${value.slice(0, 8)}...` : "NOT_SET";
    
    console.log(`${present ? "✅" : "❌"} ${varName}: ${maskedValue}`);
    
    if (!present) allPresent = false;
  }
  
  console.log();
  return allPresent;
}

async function checkDatabaseTables() {
  console.log("🗄️ Database Tables Check");
  console.log("-".repeat(40));
  
  const tables = [
    "email_campaigns",
    "email_audiences",
    "subscribers",
    "email_campaign_audiences",
    "email_audience_subscribers",
  ];
  
  let allTablesExist = true;
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select("id")
        .limit(1);
      
      if (error) {
        console.log(`❌ ${table}: ${error.message}`);
        allTablesExist = false;
      } else {
        console.log(`✅ ${table}: Accessible`);
      }
    } catch (error) {
      console.log(`❌ ${table}: ${error.message}`);
      allTablesExist = false;
    }
  }
  
  console.log();
  return allTablesExist;
}

async function checkScheduledCampaigns() {
  console.log("📅 Scheduled Campaigns Check");
  console.log("-".repeat(40));
  
  try {
    const now = new Date().toISOString();
    
    // Check for scheduled campaigns
    const { data: scheduledCampaigns, error: scheduledError } = await supabase
      .from("email_campaigns")
      .select("id, name, status, scheduled_at, created_at")
      .eq("status", "scheduled")
      .lte("scheduled_at", now)
      .order("scheduled_at", { ascending: true });
    
    if (scheduledError) {
      console.log(`❌ Error fetching scheduled campaigns: ${scheduledError.message}`);
      return false;
    }
    
    console.log(`📊 Found ${scheduledCampaigns?.length || 0} campaigns due for sending`);
    
    if (scheduledCampaigns && scheduledCampaigns.length > 0) {
      scheduledCampaigns.forEach((campaign, index) => {
        console.log(`   ${index + 1}. ${campaign.name} (${campaign.id})`);
        console.log(`      Status: ${campaign.status}`);
        console.log(`      Scheduled: ${new Date(campaign.scheduled_at).toLocaleString()}`);
        console.log(`      Created: ${new Date(campaign.created_at).toLocaleString()}`);
      });
    }
    
    // Check for campaigns in other states
    const { data: otherCampaigns, error: otherError } = await supabase
      .from("email_campaigns")
      .select("status, count")
      .select("status")
      .in("status", ["sending", "sent", "failed"])
      .order("updated_at", { ascending: false })
      .limit(10);
    
    if (!otherError && otherCampaigns) {
      const statusCounts = {};
      otherCampaigns.forEach(campaign => {
        statusCounts[campaign.status] = (statusCounts[campaign.status] || 0) + 1;
      });
      
      console.log("📊 Recent campaign status counts:");
      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`   ${status}: ${count}`);
      });
    }
    
    console.log();
    return true;
  } catch (error) {
    console.log(`❌ Error checking scheduled campaigns: ${error.message}`);
    console.log();
    return false;
  }
}

async function checkAudiencesAndSubscribers() {
  console.log("👥 Audiences and Subscribers Check");
  console.log("-".repeat(40));
  
  try {
    // Check audiences
    const { data: audiences, error: audiencesError } = await supabase
      .from("email_audiences")
      .select("id, name, created_at")
      .order("created_at", { ascending: false })
      .limit(5);
    
    if (audiencesError) {
      console.log(`❌ Error fetching audiences: ${audiencesError.message}`);
      return false;
    }
    
    console.log(`📊 Found ${audiences?.length || 0} audiences`);
    
    if (audiences && audiences.length > 0) {
      for (const audience of audiences) {
        // Get subscriber count for this audience
        const { data: subscribers, error: subError } = await supabase
          .from("email_audience_subscribers")
          .select("subscriber_id")
          .eq("audience_id", audience.id);
        
        const subscriberCount = subError ? 0 : (subscribers?.length || 0);
        
        console.log(`   ${audience.name} (${audience.id}): ${subscriberCount} subscribers`);
      }
    }
    
    // Check total subscribers
    const { data: allSubscribers, error: allSubError } = await supabase
      .from("subscribers")
      .select("id, email, status")
      .eq("status", "active")
      .limit(10);
    
    if (allSubError) {
      console.log(`❌ Error fetching subscribers: ${allSubError.message}`);
    } else {
      console.log(`📊 Total active subscribers: ${allSubscribers?.length || 0} (showing first 10)`);
      
      if (allSubscribers && allSubscribers.length > 0) {
        allSubscribers.forEach((sub, index) => {
          console.log(`   ${index + 1}. ${sub.email} (${sub.id})`);
        });
      }
    }
    
    console.log();
    return true;
  } catch (error) {
    console.log(`❌ Error checking audiences and subscribers: ${error.message}`);
    console.log();
    return false;
  }
}

async function testAPIEndpoints() {
  console.log("🌐 API Endpoints Check");
  console.log("-".repeat(40));
  
  const endpoints = [
    {
      name: "Process Scheduled",
      url: `${SITE_URL}/api/email-campaigns/process-scheduled`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${CRON_SECRET}`,
      },
    },
    {
      name: "Scheduler Status",
      url: `${SITE_URL}/api/scheduler`,
      method: "GET",
    },
    {
      name: "AWS Environment",
      url: `${SITE_URL}/api/check-aws-env`,
      method: "GET",
      headers: {
        "Authorization": `Bearer ${CRON_SECRET}`,
      },
    },
  ];
  
  let allEndpointsWork = true;
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint.url, {
        method: endpoint.method,
        headers: endpoint.headers,
      });
      
      const data = await response.json();
      
      if (response.ok) {
        console.log(`✅ ${endpoint.name}: HTTP ${response.status}`);
        if (data.message) {
          console.log(`   Message: ${data.message}`);
        }
      } else {
        console.log(`❌ ${endpoint.name}: HTTP ${response.status}`);
        console.log(`   Error: ${data.error || "Unknown error"}`);
        allEndpointsWork = false;
      }
    } catch (error) {
      console.log(`❌ ${endpoint.name}: ${error.message}`);
      allEndpointsWork = false;
    }
  }
  
  console.log();
  return allEndpointsWork;
}

async function checkCronJob() {
  console.log("⏰ Cron Job Check");
  console.log("-".repeat(40));
  
  try {
    // Check if there's a cron job running
    const response = await fetch(`${SITE_URL}/api/email-campaigns/process-scheduled`, {
      method: "GET",
    });
    
    const data = await response.json();
    
    if (response.ok && data.lastExecutionTime) {
      const lastExecution = new Date(data.lastExecutionTime);
      const now = new Date();
      const timeDiff = Math.floor((now - lastExecution) / (1000 * 60)); // minutes
      
      console.log(`✅ Last execution: ${data.lastExecutionTime}`);
      console.log(`⏱️ Time since last execution: ${timeDiff} minutes`);
      console.log(`📅 Next expected execution: ${data.nextExpectedExecution}`);
      
      if (timeDiff > 5) {
        console.log("⚠️ Warning: Cron job may not be running (last execution > 5 minutes ago)");
      } else {
        console.log("✅ Cron job appears to be running normally");
      }
    } else {
      console.log("❌ Could not retrieve cron job status");
    }
    
    console.log();
    return true;
  } catch (error) {
    console.log(`❌ Error checking cron job: ${error.message}`);
    console.log();
    return false;
  }
}

async function generateRecommendations(results) {
  console.log("🎯 Recommendations");
  console.log("-".repeat(40));
  
  const issues = [];
  
  if (!results.envVars) {
    issues.push("Missing environment variables - check your .env.local file");
  }
  
  if (!results.dbTables) {
    issues.push("Database tables not accessible - check Supabase connection");
  }
  
  if (!results.apiEndpoints) {
    issues.push("API endpoints not responding - check server status");
  }
  
  if (!results.scheduledCampaigns) {
    issues.push("Cannot check scheduled campaigns - database issue");
  }
  
  if (issues.length === 0) {
    console.log("✅ All basic checks passed!");
    console.log("🔧 Next steps:");
    console.log("   1. Run the comprehensive test suite: node test-scheduled-campaigns.js");
    console.log("   2. Check server logs for any errors");
    console.log("   3. Verify AWS SES configuration");
    console.log("   4. Test with a real scheduled campaign");
  } else {
    console.log("❌ Issues found:");
    issues.forEach((issue, index) => {
      console.log(`   ${index + 1}. ${issue}`);
    });
    
    console.log("\n🔧 Troubleshooting steps:");
    console.log("   1. Check environment variables in .env.local");
    console.log("   2. Verify Supabase connection and permissions");
    console.log("   3. Ensure server is running and accessible");
    console.log("   4. Check AWS credentials and SES setup");
  }
  
  console.log();
}

async function runDebugDiagnostics() {
  console.log("🔍 Debug Diagnostics for Scheduled Campaign System");
  console.log("=" .repeat(60));
  
  const results = {
    envVars: await checkEnvironmentVariables(),
    dbTables: await checkDatabaseTables(),
    scheduledCampaigns: await checkScheduledCampaigns(),
    audiencesAndSubscribers: await checkAudiencesAndSubscribers(),
    apiEndpoints: await testAPIEndpoints(),
    cronJob: await checkCronJob(),
  };
  
  console.log("=" .repeat(60));
  console.log("📊 DIAGNOSTIC SUMMARY");
  console.log("=" .repeat(60));
  
  Object.entries(results).forEach(([check, passed]) => {
    const status = passed ? "✅ PASS" : "❌ FAIL";
    console.log(`${status} ${check}`);
  });
  
  const passedCount = Object.values(results).filter(Boolean).length;
  const totalCount = Object.keys(results).length;
  
  console.log(`\n📈 Health Score: ${((passedCount / totalCount) * 100).toFixed(1)}% (${passedCount}/${totalCount})`);
  
  await generateRecommendations(results);
  
  return passedCount === totalCount;
}

// Run the debug diagnostics
runDebugDiagnostics()
  .then((healthy) => {
    process.exit(healthy ? 0 : 1);
  })
  .catch((error) => {
    console.error("💥 Debug diagnostics failed:", error);
    process.exit(1);
  });
