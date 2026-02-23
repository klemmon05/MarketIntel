# PE Triggers MVP

PE Triggers is a Next.js + Supabase + Prisma platform that turns daily PE trigger reports into a persistent system of record + action workflow.

## Stack
- Next.js 14 App Router + TypeScript
- Tailwind CSS
- Supabase Auth (email/password)
- Supabase Postgres
- Prisma ORM + SQL migrations
- Zod validation
- Server Actions

## Features
- Auth-protected app pages via middleware
- Core data model: Sponsors, Portfolio Companies, Source Items, Signals, Trigger Hypotheses, TriggerSignal, Action Logs
- CRUD-style admin views for sponsors, companies, signals, and triggers
- Signal dedupe: `company + signal_type + normalized observed_fact`
- Trigger status workflow including resolve-note requirement
- Import JSON workflow with Zod schema validation and preview
- Daily report view with markdown copy export
- Seed script for realistic starter data
- Optional RLS policies (all authenticated users) included in initial SQL migration

## Environment variables
Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Set:
- `DATABASE_URL` - Supabase pooled connection string
- `DIRECT_URL` - direct connection (used by Prisma migrations)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Supabase setup notes
1. Create a Supabase project.
2. Enable email/password auth in Authentication > Providers.
3. Use generated project URL + anon key in `.env.local`.
4. Use Postgres connection strings for `DATABASE_URL` and `DIRECT_URL`.
5. Run SQL from Prisma migration if using SQL editor manually, or run Prisma migration commands below.

## Install and run
```bash
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

## Build for production
```bash
npm run build
npm run start
```

## Prisma commands
```bash
npm run db:migrate
npm run db:deploy
npm run db:seed
```

## Import JSON contract
Expected payload shape:
- `report_date: string (yyyy-mm-dd)`
- `sponsors[]`
  - `name`
  - `portfolio_companies[]`
    - `name`, `sector`, `geography`
    - `signals[]` with `signal_type`, `observed_fact`, `first_seen_at`, `last_seen_at`, `confidence_flags`, optional `source`
    - `triggers[]` with `trigger_type`, `title`, `hypothesis_text`, `confidence_score`, `quiet_window`, `linked_signal_indexes`, optional `sponsor_intent_notes`

See `src/lib/importSchema.ts` and `/import` for live validation.
