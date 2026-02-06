This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Stripe Integration

This project uses Supabase's [Stripe Wrapper](https://supabase.com/docs/guides/database/extensions/wrappers/stripe) to access Stripe data directly from Postgres. The Stripe data is stored in a private schema called `stripe_tables`.

### Setup

1. Enable the Stripe wrapper in your Supabase project
2. Configure your environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Public/anon key for client-side operations
   - `SUPABASE_SERVICE_ROLE_KEY`: Service role key for accessing private schemas
   - Various Stripe API keys and price IDs

### How it Works

When a user logs in, the application:

1. Retrieves their Stripe customer ID from their profile
2. Queries the Supabase Stripe tables to check their subscription status
3. Updates their profile with the current subscription type and expiration dates

This approach eliminates the need for direct Stripe API calls and their associated rate limits.

## Project Structure

- `app/` – Next.js app router
- `components/` – React components
- `docs/` – Documentation (guides, audits, references)
- `scripts/` – Executable scripts (`scripts/legacy/` for older JS scripts)
- `db/` – Database exports and migration archives
- `supabase/` – Supabase config and migrations

See [docs/PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md) for details.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
