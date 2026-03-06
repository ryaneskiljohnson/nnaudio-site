/**
 * @fileoverview Verifies NNAudio RAG: knowledge base loads and retrieval returns grounded content.
 * @module scripts/verify-rag
 *
 * Run: npx tsx scripts/verify-rag.ts
 * Requires: .env.local with OPENAI_API_KEY for full pipeline check (optional for retrieve-only).
 */

import * as dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(__dirname, "../.env.local") });

async function main() {
  console.log("Verifying NNAudio RAG...\n");

  const { nnaudioRAG } = await import("../lib/rag");

  // 1. Retrieve context for a known NNAudio topic
  const query = "Where do I redeem a serial code?";
  const context = await nnaudioRAG.retrieveRelevantContext(query);

  const hasRedeem = /redeem|nnaud\.io\/redeem/i.test(context);
  const hasNNAudio = /nnaud|nnaudio/i.test(context);

  if (!context || context.length < 100) {
    console.error("FAIL: Retrieved context too short or empty.");
    process.exit(1);
  }
  if (!hasRedeem) {
    console.error("FAIL: Context does not mention redeem (expected for this query).");
    process.exit(1);
  }
  if (!hasNNAudio) {
    console.error("FAIL: Context does not mention NNAudio/nnaud.io.");
    process.exit(1);
  }

  console.log("OK: Knowledge base loaded and retrieval returns NNAudio-grounded context.\n");

  // 2. If OpenAI is configured, run generate + verify once
  if (process.env.OPENAI_API_KEY) {
    const response = await nnaudioRAG.generateResponse(query, []);
    const verified = await nnaudioRAG.verifyResponse(response, context);
    if (!verified) {
      console.error("FAIL: generateResponse or verifyResponse failed.");
      process.exit(1);
    }
    console.log("OK: generateResponse and verifyResponse passed.\n");
  } else {
    console.log("Skip: OPENAI_API_KEY not set; skipping generate/verify.\n");
  }

  console.log("RAG verification complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
