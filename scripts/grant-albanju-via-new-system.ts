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

const USER_EMAIL = "support@newnationllc.com";

async function main() {
  console.log("🎁 Granting Albanju via Product Grants System");
  console.log("=".repeat(60));

  // Find Albanju product
  const { data: albanju } = await supabase
    .from("products")
    .select("id, name, slug")
    .ilike("name", "%albanju%")
    .eq("status", "active")
    .single();

  if (!albanju) {
    console.error("❌ Albanju product not found");
    process.exit(1);
  }

  console.log(`✅ Found: ${albanju.name} (${albanju.id})\n`);

  // Check if already granted
  const { data: existing } = await supabase
    .from("product_grants")
    .select("id")
    .eq("user_email", USER_EMAIL.toLowerCase())
    .eq("product_id", albanju.id)
    .single();

  if (existing) {
    console.log("✅ Albanju is already granted to this user!");
    return;
  }

  // Grant the product
  const { data: grant, error } = await supabase
    .from("product_grants")
    .insert({
      user_email: USER_EMAIL.toLowerCase(),
      product_id: albanju.id,
      notes: "Support account grant",
    })
    .select()
    .single();

  if (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }

  console.log("✅ SUCCESS!");
  console.log("=".repeat(60));
  console.log(`Albanju has been granted to ${USER_EMAIL}`);
  console.log(`Grant ID: ${grant.id}`);
  console.log("\nThe product will now:");
  console.log("  ✅ Show up in NNAudio Access products");
  console.log("  ✅ Appear as a $0 order in 'My Orders'");
  console.log("  ✅ Be available for download");
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});

