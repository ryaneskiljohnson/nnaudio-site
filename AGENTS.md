# AGENTS.md

## Cursor Cloud specific instructions

This is the **Cymasphere / NNAudio** Next.js 16 (App Router, Turbopack) e-commerce site
for selling audio plugins and sample packs. It integrates Supabase (auth + Postgres),
Stripe (payments, via Supabase Stripe Wrapper), SendGrid (email), and Meta/Facebook Ads.

### Package manager & running

- The package manager is **Bun** (`packageManager: bun@1.2.2`). `bun.lock` is authoritative;
  a `package-lock.json` also exists but the project and CI use Bun. Install with
  `bun install --frozen-lockfile`.
- Bun is installed at `~/.bun/bin` and added to PATH in `~/.bashrc`, so it is available in
  login/interactive shells. In non-interactive contexts use the full path `~/.bun/bin/bun`.
- Dev server: `bun run dev` (Next.js + Turbopack) serves on `http://localhost:3000`.
  The homepage skips Supabase session refresh for anonymous users, so it renders without
  real backend credentials.

### Environment variables (`.env.local`)

- A `.env.local` is **required** — the request proxy (`proxy.ts` → `utils/supabase/middleware.ts`)
  constructs a Supabase client on every non-homepage route and needs
  `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` in valid format or those routes error.
- `.env.local` is gitignored. This environment already has one populated with **placeholder**
  values (see `.env.example` for the full list of keys). With placeholders, the marketing site,
  cart (client-side `localStorage`), and forms work, but backend-backed features (real product
  listings, login/signup completion, checkout) show empty/error states. To exercise those flows,
  replace the placeholders with real Supabase/Stripe/SendGrid credentials.

### Lint / test / build

- Tests: `bun run test` (Vitest). All suites pass. Facebook Ads route tests rely on the
  `FACEBOOK_MOCK_CONNECTION` mock and do not need real credentials.
- Server bundle guard (CI check): `bun run verify:barrels`.
- **Lint is currently broken** regardless of your changes: `bun run lint` (`eslint .`) throws
  `TypeError: Converting circular structure to JSON` because ESLint 10 + `eslint-config-next`
  loaded via `FlatCompat` are incompatible. This is a pre-existing toolchain issue, not caused by
  edits — do not chase it unless you are specifically fixing the ESLint config.
- Build: `bun run build` (`next build`). Runtime deps assume `.env.local` is present.

### Gotchas

- The homepage hero uses a heavy WebGL/particle animation that can freeze or crash an automated
  Chrome tab during prolonged scrolling. For GUI/manual testing, keep time on `/` brief and drive
  actions on lighter routes (e.g. `/signup`, `/cart`, `/products`).
- `scripts/` contains hundreds of one-off operational TypeScript scripts (product sync, image
  processing, Stripe/Supabase maintenance) that require real credentials; they are not part of the
  normal dev loop.
