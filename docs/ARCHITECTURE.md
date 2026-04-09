# Architecture

> Provisional. Snapshot of the scaffolding as it stands. Things will move.

## Two-service shape

```
┌─────────────────────┐         ┌──────────────────────────────┐
│   Expo app          │  HTTPS  │   Supabase                   │
│   (React Native)    │ ──────► │   Postgres + Auth + Realtime │
│                     │         │   Edge Functions (Deno)      │
└─────────────────────┘         └──────────────┬───────────────┘
                                               │
                                               ▼
                                  ┌────────────────────────┐
                                  │ Apollo · Gmail · OpenAI │
                                  │ Stripe                  │
                                  └────────────────────────┘
```

The mobile app **only** talks to Supabase. All third-party API keys live in Edge Function env vars and never reach the client. Gmail OAuth tokens live on the user's `profiles` row, written by the `gmail-oauth` function with the service-role key.

## Repo layout

```
app/                 expo-router screens
  _layout.tsx        providers + AuthGate
  index.tsx          redirect into the right group
  (auth)/sign-in.tsx
  (app)/index.tsx              campaign list
  (app)/settings.tsx
  (app)/campaign/[id].tsx      live progress
  (app)/new/audience.tsx       wizard step 1
  (app)/new/leads.tsx          wizard step 2
  (app)/new/compose.tsx        wizard step 3

components/          Button, Card, TextField, Chip, ProgressBar,
                     BottomSheet, Header, Screen, EmptyState

lib/
  supabase.ts        client w/ AsyncStorage
  auth-store.ts      Zustand
  draft-store.ts     wizard state across the 3 routes
  queries.ts         TanStack Query hooks + edge fn invokers
  gmail-connect.ts   expo-auth-session flow
  theme.ts, types.ts, usage.ts

supabase/
  migrations/0001_init.sql        tables + RLS
  migrations/0002_send_cron.sql   pg_cron → send-batch
  functions/
    _shared/        cors.ts, supabase.ts, gmail.ts, usage.ts
    gmail-oauth/
    search-leads/
    generate-email/
    personalize-emails/
    send-batch/
    create-checkout/
    stripe-webhook/
```

## Data flow: creating a campaign

1. **Audience screen** — user types a query, hits "Find people". Client calls `search-leads` Edge Function.
2. `search-leads` checks `leads_cache` → falls back to Apollo `/people/search` → caches results → bumps `usage.leads_searched`.
3. **Leads screen** — user deselects anyone they don't want.
4. **Compose screen** — user writes (or AI-generates via `generate-email`) a template, optionally enables "rewrite each email with AI".
5. On send, the client:
   - Inserts a `campaigns` row (status `draft`).
   - Inserts one `recipients` row per selected lead (status `queued`).
   - If AI personalize is on, calls `personalize-emails` to populate `personalized_subject` / `personalized_body`.
   - Flips the campaign status to `sending`.
6. **pg_cron** fires `send-batch` every minute. It picks queued recipients (max 20/tick), respects per-user `daily_send_limit`, sends via Gmail API, sleeps 30–60s between sends per user, stops on first Gmail error per user.
7. **Campaign detail screen** subscribes to Supabase Realtime on `recipients` filtered by `campaign_id` and re-renders as statuses flip.

## State

- **Auth & session** → Zustand (`auth-store.ts`), driven by Supabase `onAuthStateChange`.
- **Wizard draft** → Zustand (`draft-store.ts`), reset after a successful send.
- **Server data** → TanStack Query, with realtime invalidation via the Supabase channel in `useRecipients`.

## Usage gating

Mirror lives in two places (provisional — collapse later if it gets annoying):

- `lib/usage.ts` — client-side limits for the progress bars.
- `supabase/functions/_shared/usage.ts` — authoritative server-side checks.

`search-leads` returns 402 with `lead_limit_reached` when over budget; the audience screen catches this and shows an inline upgrade prompt (no paywall splash).

## Things that are stubbed / fake / TODO

- Google sign-in button on `(auth)/sign-in.tsx` — alerts "coming soon".
- `stripe-webhook` signature verification.
- Apollo response field names in `search-leads` — guessed; verify against the real API.
- The send-success animation (no Lottie file yet).
- A real illustration on the empty state (emoji placeholder).
- Font choice (system font for now).
- Tests.
