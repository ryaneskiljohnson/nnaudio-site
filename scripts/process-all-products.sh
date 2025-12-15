#!/bin/bash

# List of all product slugs (first 10 for testing)
products=(
  "20-for-20-midi-bundle-1"
  "albanju"
  "alice-cthulhu"
  "all-guitar-bundle"
  "analog-plugin-bundle"
  "apache-flute"
  "apache-free-midi"
  "atmosphere-bundle"
  "bakers-delight-midi"
  "bakers-dozen"
)

total=${#products[@]}
current=0

for slug in "${products[@]}"; do
  current=$((current + 1))
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📦 Product $current/$total"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  npx tsx scripts/scrape-product-content.ts "$slug"
  
  # Small delay between requests
  sleep 2
done

echo ""
echo "✅ Completed processing $total products!"
