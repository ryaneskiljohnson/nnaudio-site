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

async function findAlbanjuPlugin() {
  console.log("🔍 Searching for Albanju plugin zip file...\n");

  // Try common expected paths first
  const expectedPaths = [
    "products/plugins/plugin_Albanju.zip",
    "products/plugins/plugin_albanju.zip",
    "products/plugins/Albanju.zip",
    "products/plugins/albanju.zip",
    "products/albanju/plugin_Albanju.zip",
    "products/albanju/plugin_albanju.zip",
    "products/albanju/Albanju.zip",
    "products/albanju/albanju.zip",
  ];

  for (const expectedPath of expectedPaths) {
    try {
      // Try to get file metadata by attempting to download (just to check if it exists)
      const { data, error } = await supabase.storage
        .from("product-downloads")
        .download(expectedPath);

      if (!error && data) {
        // File exists, get its size
        const { data: listData } = await supabase.storage
          .from("product-downloads")
          .list(expectedPath.split('/').slice(0, -1).join('/'), {
            limit: 100,
          });

        const fileName = expectedPath.split('/').pop()!;
        const fileInfo = listData?.find(f => f.name === fileName);
        const fileSize = fileInfo?.metadata?.size || 0;

        console.log(`✅ Found: ${expectedPath}`);
        console.log(`   Size: ${(fileSize / 1024 / 1024).toFixed(2)} MB\n`);
        return {
          path: expectedPath,
          name: fileName,
          size: fileSize,
        };
      }
    } catch (e) {
      // File doesn't exist at this path, continue
      continue;
    }
  }

  // If not found in expected paths, search all locations
  const locationsToCheck = [
    "products/plugins",
    "products/albanju",
    "",
  ];

  for (const location of locationsToCheck) {
    const { data: files, error } = await supabase.storage
      .from("product-downloads")
      .list(location, {
        limit: 1000,
      });

    if (error) {
      continue;
    }

    if (files) {
      for (const file of files) {
        const fileName = file.name.toLowerCase();
        if (
          (fileName.includes("albanju") && fileName.includes("plugin")) ||
          (fileName.includes("albanju") && fileName.endsWith(".zip") && !fileName.includes("sample"))
        ) {
          const fullPath = location ? `${location}/${file.name}` : file.name;
          console.log(`✅ Found: ${fullPath}`);
          console.log(`   Size: ${((file.metadata?.size || 0) / 1024 / 1024).toFixed(2)} MB\n`);
          return {
            path: fullPath,
            name: file.name,
            size: file.metadata?.size || 0,
          };
        }
      }
    }
  }

  return null;
}

async function associatePlugin(manualPath?: string) {
  console.log("🔗 Associating Albanju Plugin with Product\n");
  console.log("=".repeat(60));

  // Find the plugin file
  let pluginFile = manualPath ? null : await findAlbanjuPlugin();
  
  // If manual path provided, use it
  if (manualPath && !pluginFile) {
    console.log(`📝 Using provided path: ${manualPath}\n`);
    try {
      // Try to verify the file exists
      const { data, error } = await supabase.storage
        .from("product-downloads")
        .download(manualPath);
      
      if (error) {
        console.error(`❌ File not found at: ${manualPath}`);
        console.error(`   Error: ${error.message}`);
        console.log("\n💡 Please verify the file path in Supabase Storage");
        process.exit(1);
      }
      
      // Get file size from the blob
      const fileSize = data.size;
      const fileName = manualPath.split('/').pop()!;
      
      pluginFile = {
        path: manualPath,
        name: fileName,
        size: fileSize,
      };
      
      console.log(`✅ File found: ${manualPath}`);
      console.log(`   Size: ${(fileSize / 1024 / 1024).toFixed(2)} MB\n`);
    } catch (e: any) {
      console.error(`❌ Error accessing file: ${e.message}`);
      process.exit(1);
    }
  }

  if (!pluginFile) {
    console.error("❌ Could not find Albanju plugin zip file in storage");
    console.log("\n💡 The plugin file needs to be uploaded to Supabase Storage first.");
    console.log("\n📋 Expected file path: products/albanju/plugin_Albanju.zip");
    console.log("   (or similar naming like plugin_albanju.zip)");
    console.log("\n🔧 Once uploaded, you can:");
    console.log("   1. Run this script again to auto-associate it");
    console.log("   2. Or manually provide the file path below");
    
    // Allow manual path input
    const manualPath = process.argv[2];
    if (manualPath) {
      console.log(`\n📝 Using provided path: ${manualPath}`);
      // Try to verify the file exists
      try {
        const { data, error } = await supabase.storage
          .from("product-downloads")
          .download(manualPath);
        
        if (error) {
          console.error(`❌ File not found at: ${manualPath}`);
          console.error(`   Error: ${error.message}`);
          process.exit(1);
        }
        
        // Get file size from the blob
        const fileSize = data.size;
        const fileName = manualPath.split('/').pop()!;
        
        pluginFile = {
          path: manualPath,
          name: fileName,
          size: fileSize,
        };
        
        console.log(`✅ File found: ${manualPath}`);
        console.log(`   Size: ${(fileSize / 1024 / 1024).toFixed(2)} MB\n`);
      } catch (e: any) {
        console.error(`❌ Error accessing file: ${e.message}`);
        process.exit(1);
      }
    } else {
      console.log("\n💡 To manually specify the path, run:");
      console.log("   bun run scripts/associate-albanju-plugin.ts 'products/albanju/plugin_Albanju.zip'");
      process.exit(1);
    }
  }

  // Get the product
  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id, name, slug, downloads")
    .eq("slug", "albanju")
    .eq("status", "active")
    .single();

  if (productError || !product) {
    console.error("❌ Product not found: albanju");
    process.exit(1);
  }

  console.log(`📦 Product: ${product.name} (${product.slug})\n`);

  // Check if plugin is already associated
  const currentDownloads = (product.downloads as any[]) || [];
  const existingPlugin = currentDownloads.find(
    (d: any) => d.type === "plugin" && d.path === pluginFile.path
  );

  if (existingPlugin) {
    console.log("✅ Plugin is already associated!");
    console.log("\nCurrent download entry:");
    console.log(JSON.stringify(existingPlugin, null, 2));
    return;
  }

  // Prepare download object
  const downloadObject = {
    path: pluginFile.path,
    name: `${product.name} Plugin`,
    type: "plugin",
    version: null,
    file_size: pluginFile.size,
  };

  // Update downloads array - remove existing plugin downloads, keep samples
  const filteredDownloads = currentDownloads.filter(
    (d: any) => d.type !== "plugin"
  );
  const updatedDownloads = [...filteredDownloads, downloadObject];

  console.log("💾 Updating product downloads...");
  const { error: updateError } = await supabase
    .from("products")
    .update({ downloads: updatedDownloads })
    .eq("id", product.id);

  if (updateError) {
    console.error("❌ Error updating product:", updateError);
    process.exit(1);
  }

  console.log("✅ Successfully associated plugin with product!\n");
  console.log("📋 Download metadata:");
  console.log(JSON.stringify(downloadObject, null, 2));
  console.log("\n✅ Complete!");
}

// Get manual path from command line argument if provided
const manualPath = process.argv[2];

associatePlugin(manualPath).catch((error) => {
  console.error("❌ Script error:", error);
  process.exit(1);
});

