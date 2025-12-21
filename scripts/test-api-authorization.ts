import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function testAPIAuthorization() {
  console.log("🔍 Testing API Authorization Endpoint\n");
  console.log("=".repeat(60));

  // First, we need to get a valid token
  // This would normally come from NNAudio Access app login
  console.log("⚠️  To test the API endpoint, you need:");
  console.log("   1. A valid Supabase auth token from NNAudio Access");
  console.log("   2. The product_id the plugin is sending\n");

  console.log("📋 Debugging Steps:\n");
  console.log("1. Check what product_id the plugin is sending:");
  console.log("   - Open the plugin in your DAW");
  console.log("   - Check the plugin's console/logs for the product_id");
  console.log("   - It should be either '4083' (legacy) or the UUID\n");

  console.log("2. Check the API endpoint logs:");
  console.log("   - Look at your Next.js dev server console");
  console.log("   - Look for logs starting with '[NNAudio Access Product]'");
  console.log("   - These will show:");
  console.log("     * Product lookup (UUID vs legacy)");
  console.log("     * User profile info");
  console.log("     * Product grants found");
  console.log("     * Access check result\n");

  console.log("3. Test the endpoint manually:");
  console.log("   - Get your auth token from NNAudio Access");
  console.log("   - Run: curl -X POST http://localhost:3000/api/nnaudio-access/product \\");
  console.log("     -F 'token=YOUR_TOKEN' \\");
  console.log("     -F 'product_id=4083'\n");

  console.log("4. Common issues:");
  console.log("   ❌ Token expired - Re-login in NNAudio Access");
  console.log("   ❌ Wrong product_id - Plugin might be using old ID");
  console.log("   ❌ Product not found - Check legacy_product_id is set");
  console.log("   ❌ Access denied - Check product grants exist\n");

  console.log("💡 Next steps:");
  console.log("   - Check the plugin's console/logs for the exact product_id it's sending");
  console.log("   - Check your Next.js server logs for the authorization attempt");
  console.log("   - Verify the token is valid and not expired\n");
}

testAPIAuthorization().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});

