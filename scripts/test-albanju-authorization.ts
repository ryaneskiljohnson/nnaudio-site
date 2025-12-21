import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAuthorization() {
  console.log("🔍 Testing Albanju Authorization Flow\n");
  console.log("=".repeat(60));

  // Get user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, subscription, customer_id")
    .eq("email", "support@newnationllc.com")
    .single();

  if (!profile) {
    console.error("❌ User profile not found");
    return;
  }

  console.log("👤 User Profile:");
  console.log(`   Email: ${profile.email}`);
  console.log(`   Subscription: ${profile.subscription}`);
  console.log(`   Customer ID: ${profile.customer_id || "none"}\n`);

  // Test product lookup by legacy ID
  console.log("🔍 Testing Product Lookup:");
  const legacyId = "4083";
  const uuid = "a5a5e9e1-3392-484a-b48f-4aca71fbb122";

  // Try by legacy ID
  const { data: productByLegacy } = await supabase
    .from("products")
    .select("id, name, slug, legacy_product_id, status")
    .eq("legacy_product_id", legacyId)
    .eq("status", "active")
    .single();

  console.log(`   By legacy_product_id "${legacyId}":`, productByLegacy ? "✅ Found" : "❌ Not found");
  if (productByLegacy) {
    console.log(`      UUID: ${productByLegacy.id}`);
    console.log(`      Name: ${productByLegacy.name}`);
  }

  // Try by UUID
  const { data: productByUuid } = await supabase
    .from("products")
    .select("id, name, slug, legacy_product_id, status")
    .eq("id", uuid)
    .eq("status", "active")
    .single();

  console.log(`   By UUID "${uuid}":`, productByUuid ? "✅ Found" : "❌ Not found");
  if (productByUuid) {
    console.log(`      Name: ${productByUuid.name}`);
  }

  if (!productByLegacy && !productByUuid) {
    console.error("\n❌ Product not found by either method!");
    return;
  }

  const productId = productByLegacy?.id || productByUuid?.id;

  // Check product grants
  console.log("\n🎁 Checking Product Grants:");
  const { data: grants } = await supabase
    .from("product_grants")
    .select("product_id")
    .eq("user_email", profile.email.toLowerCase());

  console.log(`   Grants found: ${grants?.length || 0}`);
  if (grants && grants.length > 0) {
    grants.forEach((grant) => {
      const hasAccess = grant.product_id === productId;
      console.log(`   - ${grant.product_id} ${hasAccess ? "✅ (Albanju)" : ""}`);
    });
  }

  const hasGrant = grants?.some((g) => g.product_id === productId);
  console.log(`   Has Albanju grant: ${hasGrant ? "✅ YES" : "❌ NO"}\n`);

  // Check subscription
  console.log("💳 Checking Subscription:");
  const hasActiveSubscription = profile.subscription && profile.subscription !== "none";
  console.log(`   Subscription: ${profile.subscription}`);
  console.log(`   Has active subscription: ${hasActiveSubscription ? "✅ YES" : "❌ NO"}\n`);

  // Check NFR
  console.log("🎫 Checking NFR License:");
  const { data: nfr } = await supabase
    .from("user_management")
    .select("pro")
    .eq("user_email", profile.email.toLowerCase())
    .single();

  console.log(`   NFR Pro status: ${nfr?.pro ? "✅ YES" : "❌ NO"}\n`);

  // Summary
  console.log("=".repeat(60));
  console.log("📊 Authorization Summary:\n");

  let shouldHaveAccess = false;
  const reasons: string[] = [];

  if (nfr?.pro) {
    shouldHaveAccess = true;
    reasons.push("NFR Pro license");
  }

  if (hasActiveSubscription) {
    shouldHaveAccess = true;
    reasons.push(`Active subscription (${profile.subscription})`);
  }

  if (hasGrant) {
    shouldHaveAccess = true;
    reasons.push("Product grant");
  }

  console.log(`   Should have access: ${shouldHaveAccess ? "✅ YES" : "❌ NO"}`);
  if (reasons.length > 0) {
    console.log(`   Reasons: ${reasons.join(", ")}`);
  }

  console.log(`\n   Product ID (UUID): ${productId}`);
  console.log(`   Product ID (Legacy): ${legacyId}`);
  console.log(`\n💡 The plugin should send product_id: "${legacyId}" or "${productId}"`);
  console.log(`   Both should work, but legacy ID "${legacyId}" is what the plugin likely uses.\n`);
}

testAuthorization().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});

