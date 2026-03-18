# Vercel 250 MB Serverless Function Limit

Reference: [Troubleshooting Build Error: Serverless Function has exceeded the unzipped maximum size of 250 MB](https://vercel.com/kb/guide/troubleshooting-function-250mb-limit).

## Automated guard (prevents regressions)

- **`bun run verify:barrels`** — fails if a configured barrel re-exports heavy modules again (e.g. `email-campaigns` → `./media`). Extend `scripts/check-server-barrel-exports.ts` when you add new barrels that must stay isolated.
- **Vercel** runs this before `next build` via `vercel.json` → `buildCommand`.

## What we do in this project

- **`next.config.js`**
  - **`serverExternalPackages`**: Heavy deps (canvas, AWS SDK, Langchain, jsdom, jspdf, openai) are externalized so they load from `node_modules` at runtime instead of being bundled into the function.
  - **`outputFileTracingExcludes`**: Scripts, tests, and spec files are excluded from output file tracing so they are not copied into the serverless bundle.

## Debugging size on Vercel

To see which files/deps contribute to the function size:

1. In the Vercel project: **Settings → Environment Variables**
2. Add: `VERCEL_ANALYZE_BUILD_OUTPUT` = `1`
3. Redeploy. Build logs will show uncompressed function sizes (MB) and a breakdown of the largest contributors.

Remove the variable after debugging if you don’t want the extra log output on every build.

## Barrel exports and heavy server actions

**Do not** re-export modules that import native/heavy deps (e.g. `sharp`, `canvas`) from a shared `index.ts` if many pages import from that barrel. Every importer’s server bundle can pull the full dependency tree. Example: `@/app/actions/email-campaigns` must not export `media.ts` (Sharp); import `@/app/actions/email-campaigns/media` only from campaign editor / preview flows.

## If you still hit the limit

- Run `bun dedupe` (or `npm dedupe`) to reduce duplicate deps.
- Use dynamic `import()` for heavy code used only on specific routes so it isn’t in every function.
- Move image/PDF generation or other heavy work to a separate service and call it from the function.
- Ensure large static assets (images, video) live in `public/` or external storage and are not imported in server code.
