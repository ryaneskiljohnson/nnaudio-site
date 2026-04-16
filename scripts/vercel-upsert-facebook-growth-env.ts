/**
 * @fileoverview Upserts Meta and optional growth env vars into the linked Vercel project (production) via the REST API.
 * @module scripts/vercel-upsert-facebook-growth-env
 * @note Requires `VERCEL_TOKEN` in the environment (create at https://vercel.com/account/tokens). Reads secrets from `.env.local`.
 * @example VERCEL_TOKEN=... bun run scripts/vercel-upsert-facebook-growth-env.ts
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "dotenv";

config({ path: ".env.local" });

const VERCEL_API = "https://api.vercel.com";

type VercelProjectFile = {
  projectId: string;
  orgId: string;
  projectName: string;
};

/**
 * @brief Parses `.vercel/project.json` for project and team identifiers.
 * @returns Parsed project metadata.
 */
function readVercelProject(): VercelProjectFile {
  const path = resolve(process.cwd(), ".vercel/project.json");
  if (!existsSync(path)) {
    throw new Error("Missing .vercel/project.json — run `vercel link` in this repo first.");
  }
  const raw = JSON.parse(readFileSync(path, "utf-8")) as VercelProjectFile;
  if (!raw.projectId || !raw.orgId) {
    throw new Error(".vercel/project.json must include projectId and orgId.");
  }
  return raw;
}

/**
 * @brief Upserts one environment variable on the Vercel project.
 * @param token - Vercel API bearer token.
 * @param teamId - Team / scope id (`orgId` from project.json).
 * @param projectId - Vercel project id.
 * @param key - Variable name.
 * @param value - Variable value.
 * @returns Parsed JSON response from Vercel.
 */
async function upsertEnv(
  token: string,
  teamId: string,
  projectId: string,
  key: string,
  value: string
): Promise<unknown> {
  const url = new URL(`${VERCEL_API}/v10/projects/${projectId}/env`);
  url.searchParams.set("upsert", "true");
  url.searchParams.set("teamId", teamId);
  const res = await fetch(url.toString(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      key,
      value,
      type: "sensitive",
      target: ["production"],
      comment: "Synced via scripts/vercel-upsert-facebook-growth-env.ts for autonomous growth ops",
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Vercel API ${res.status} for ${key}: ${text.slice(0, 500)}`);
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

/**
 * @brief CLI entry: upserts Facebook system user token and ad account id when present locally.
 * @returns void
 */
async function main(): Promise<void> {
  const token = process.env.VERCEL_TOKEN?.trim();
  if (!token) {
    console.error(
      "Set VERCEL_TOKEN to a Vercel personal access token (https://vercel.com/account/tokens), then re-run:\n" +
        "  VERCEL_TOKEN=... bun run scripts/vercel-upsert-facebook-growth-env.ts"
    );
    process.exit(1);
  }

  const { projectId, orgId } = readVercelProject();
  const fbToken = process.env.FACEBOOK_SYSTEM_USER_TOKEN?.trim();
  const fbAct = process.env.FACEBOOK_AD_ACCOUNT_ID?.trim();

  if (!fbToken) {
    throw new Error("FACEBOOK_SYSTEM_USER_TOKEN is missing from .env.local");
  }
  if (!fbAct) {
    throw new Error("FACEBOOK_AD_ACCOUNT_ID is missing from .env.local");
  }
  if (fbToken.length < 150) {
    throw new Error(
      "FACEBOOK_SYSTEM_USER_TOKEN looks truncated — use Meta’s Copy button and paste the full token into .env.local."
    );
  }

  await upsertEnv(token, orgId, projectId, "FACEBOOK_SYSTEM_USER_TOKEN", fbToken);
  console.log("Upserted FACEBOOK_SYSTEM_USER_TOKEN → Vercel production.");

  await upsertEnv(token, orgId, projectId, "FACEBOOK_AD_ACCOUNT_ID", fbAct);
  console.log("Upserted FACEBOOK_AD_ACCOUNT_ID → Vercel production.");

  console.log("\nRedeploy production (or wait for the next deploy) so new serverless instances pick up the values.");
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
