# NNAudio Site – Project Structure

Overview of the project folder organization.

## Root

- **app/** – Next.js app router (pages, API routes, layouts)
- **components/** – React components
- **config/** – App configuration
- **contexts/** – React contexts
- **hooks/** – Custom React hooks
- **lib/** – Shared utilities
- **public/** – Static assets
- **styles/** – Global styles
- **types/** – TypeScript types
- **utils/** – Utility functions

## Documentation

- **docs/** – Project documentation
  - Guides, audits, summaries, quick references
  - `docs/SCALING_WITH_ADS_RESEARCH.md` – Product catalog (including free products), ad-scaling playbook, and campaign recommendations
  - `docs/scripts/` – Cymasphere tutorial content
  - `docs/context-packs/` – Context pack docs

## Scripts

- **scripts/** – Executable scripts
  - **scripts/legacy/** – Older one-off JS scripts (tests, migrations, etc.)
  - TypeScript scripts for product sync, image processing, etc.

## Database & Migrations

- **db/** – Database-related files
  - **db/exports/** – SQL exports, CSV data
  - **db/migrations-archive/** – Old migration chunks (superseded by `supabase/migrations/`)
- **supabase/** – Supabase config and migrations
  - **supabase/migrations/** – Active migrations

## Archive

- **archive/** – Logs, temp reports, one-off data files

## Other

- **chrome-extension/** – DevTools extension
- **generated-backgrounds/** – Generated product background images
- **logo-generator/** – Logo tool
- **NNAudioAccess/** – JUCE plugin source
- **sample-zips/** – Sample pack assets
