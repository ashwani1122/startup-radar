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
- Automated funding discovery from the free GDELT DOC 2.0 public news index
- Source URLs on every imported round and a current-calendar-year dashboard window
- Authenticated manual refresh plus a protected Vercel Cron endpoint

## Local setup

1. Run `npm install`.
2. Copy `.env.example` to `.env.local` and add `DATABASE_URL`, Clerk keys, and a long random `CRON_SECRET`.
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

`npm run db:sync-funding` checks the newest GDELT reports. `npm run db:backfill-funding` searches the current calendar year with smaller quarterly query slices. Vercel Cron calls `/api/cron/funding-sync` daily and `/api/cron/funding-backfill` one hour later; the second job retries one missing current-year search slice per day. Both routes accept only `Authorization: Bearer <CRON_SECRET>`. Signed-in users can also request a current refresh from the dashboard. Older records remain in PostgreSQL for deduplication but are hidden automatically when the calendar year changes.

GDELT is a broad, free news index—not a complete deal database. Imports are deliberately strict, details that are not clearly reported stay empty, and each record keeps its original public article so users can verify it.
