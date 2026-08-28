# Raise

Raise is a source-backed discovery product for recently funded, early-stage startups. It prioritizes small teams and connects company context, founders, investors, funding evidence, saved companies, and consent-aware founder messaging in one dashboard.

## Included

- Public product landing page
- Dark/light themes and reduced-motion-aware interactions
- Clerk authentication with Google sign-in support
- Server-authorized dashboard and authenticated API handlers
- Small-startup-first search and filtering
- Full startup, founder, investor, and funding-round profiles
- Source confidence and announcement provenance
- Saved startups
- In-app founder message requests
- Prisma 7 schema and Neon/PostgreSQL data access
- Durable PostgreSQL candidate queue with retries and cross-source deduplication
- SEC EDGAR Form D live monitoring and current-year daily-index backfill
- GDELT live monitoring plus bounded 12-hour current-year search slices
- GlobeNewswire financing/press-release feeds and configurable official company/VC/accelerator RSS or Atom feeds
- Source URLs on every imported round and a current-calendar-year dashboard window
- Authenticated manual refresh plus a protected Vercel Cron endpoint

## Local setup

1. Run `npm install`.
2. Copy `.env.example` to `.env.local` and add `DATABASE_URL`, Clerk keys, a long random `CRON_SECRET`, and a compliant `SEC_USER_AGENT` containing a monitored contact email.
3. In Clerk, enable Google as a social connection and keep the sign-in/sign-up routes from `.env.example`.
4. Run `npm run db:generate`, `npx prisma migrate deploy`, and `npm run db:backfill-funding`.
5. Run `npm run dev`.

## Verification

Run `npm run typecheck`, `npm run lint`, and `npm run build`.

## Authentication model

`src/proxy.ts` attaches Clerk session context. Authorization is performed again at the resource boundary: the dashboard layout protects pages, every API route verifies the Clerk user, and founder messaging verifies that the selected founder belongs to the startup and accepts messages.

Without Clerk keys, APIs remain unavailable and return a configuration error; they do not silently become public.

## Founder messaging

The current implementation stores authenticated message requests in PostgreSQL. It does not expose private email addresses or claim to deliver email. A later notification worker can deliver accepted requests after a transactional mail provider is configured.

## Data ingestion

`npm run db:sync-funding` checks live sources, advances one bounded historical slice per provider, and processes the durable candidate queue. `npm run db:backfill-funding` advances only the current-year backfill sources and processes a larger queue batch. A GitHub Actions schedule calls `/api/cron/funding-sync` every 10 minutes using a signed GitHub OIDC identity. Vercel Cron keeps daily live and backfill fallbacks. Failed providers do not block successful providers, and failed candidates retry from PostgreSQL with increasing delays. Signed-in users can request a current refresh from the dashboard. Older rounds remain in PostgreSQL for deduplication but are hidden automatically when the calendar year changes.

The default adapters monitor GDELT, official SEC Form D filings, and GlobeNewswire financing/press-release feeds. Set `FUNDING_RSS_FEEDS` to a JSON array to add official company, VC, accelerator, directory, RSS, or Atom feeds without changing code. Supported `kind` values are `RSS`, `PRESS_RELEASE`, `ACCELERATOR`, `DIRECTORY`, `COMPANY`, and `VC`.

This is a public-source monitor, not a complete deal database. Form D notices are self-reported and do not prove that an issuer is a startup; news and press feeds can miss private or local announcements. Imports remain deliberately strict, unavailable founder or investor details stay empty, and every published round keeps its original source for verification.
