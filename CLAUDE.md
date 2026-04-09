# CLAUDE.md

Guidance for Claude Code working in this repo.

> **Status:** Greenfield. Most of what's described below is **provisional** — the spec exists but very little is built. Treat anything not yet in the codebase as a target, not a constraint. When something in here conflicts with what you actually find on disk, trust the disk and flag the drift.

## What this project is

**Mail AI** — a mobile-first cold email tool for non-technical people. The user describes who they want to reach, writes (or AI-generates) a template, the app finds matching contacts via Apollo.io, and sends personalized emails through their connected Gmail.

- Frontend: React Native via Expo
- Backend: Supabase (Postgres + Auth + Realtime + Edge Functions) — no other server
- Third-party: Apollo.io (leads), Gmail API (sending), OpenAI gpt-4o-mini (drafting/personalization), Stripe (payments, v2)

Full product spec lives in `docs/SPEC.md`. Read it before making non-trivial changes.

## Current state of the repo

As of now the repo is essentially the bare Expo template:

- `App.tsx`, `index.ts` — default Expo entry
- `package.json` — Expo SDK 54 + RN 0.81 (note: spec says SDK 52; the installed version is newer — go with what's installed unless told otherwise)
- `assets/`, `app.json`, `tsconfig.json`

None of the screens, Supabase wiring, Edge Functions, data model, or third-party integrations exist yet. When asked to build something, assume you are setting it up for the first time.

## Philosophy (load-bearing — read before designing UI)

**Simple, not minimal.** Every screen does one thing. The UI is warm and readable. No hidden complexity, but it should not feel sterile or stripped-down.

**Tone: "Friendly command center."** Think iMessage meets a really good form. Not a dashboard, not a settings panel.

UI rules that come up constantly:
- Sentence case everywhere — **no uppercase headers**
- Generous line height, big touch targets, vertical breathing room
- Single-column on mobile — never side-by-side
- Cards: `16px` padding, `12px` radius
- Prefer bottom sheets over full-screen modals
- One confident accent color; warm palette; **no dark mode for v1**
- Buttons scale to 0.97 on press (120ms spring)
- Linear progress feel: step 1 → 2 → 3 → done

If a design choice would make the app feel like a SaaS dashboard, it's wrong.

## Intended tech stack (provisional — most not installed yet)

| Layer        | Choice                                  |
| ------------ | --------------------------------------- |
| App          | Expo (SDK 54 installed) + Expo Router   |
| Styling      | Nativewind                              |
| State        | Zustand (local) + TanStack Query (server) |
| Auth         | Supabase Auth (email/password + Google) |
| DB/Realtime  | Supabase Postgres + Realtime            |
| Server logic | Supabase Edge Functions (Deno)          |
| Send queue   | Supabase pg_cron → `send-batch` function |
| Leads        | Apollo.io (proxied)                     |
| Sending      | Gmail API (proxied; OAuth via `expo-auth-session`) |
| AI           | OpenAI `gpt-4o-mini`                    |
| Payments     | Stripe (v2)                             |
| Hosting      | Expo EAS + Supabase                     |

Anything in this table can change. Confirm before adding a new dependency that locks the project into a direction.

## Architectural rules of thumb

- **Secrets never touch the client.** Apollo, Gmail, OpenAI, and Stripe keys live in Edge Functions. The mobile app only talks to Supabase.
- **Gmail tokens live in `profiles`, server-side only.** Never persist tokens on device. Request `gmail.send` scope only.
- **Sending is queue-driven, not synchronous.** The compose screen enqueues recipients; `pg_cron` calls `send-batch` every 30–60s. Respect per-user `daily_send_limit` and randomize spacing. Stop on Gmail errors and retry next day.
- **Cache Apollo results** in a `leads_cache` table keyed on the query so we don't burn credits twice.
- **Realtime over polling** for the campaign detail screen (subscribe to `recipients` filtered by `campaign_id`).
- **Usage gating is inline and friendly**, never a paywall splash. Surface the upgrade prompt at the moment a limit is hit.
- **Architect for Stripe now even though it's v2** — the `usage` table, tier field, and gate checks should exist before paid plans ship.

## Data model (provisional)

Tables: `profiles`, `campaigns`, `recipients`, `usage`, plus a `leads_cache` implied by the Apollo notes. See `docs/SPEC.md` for fields. Schemas may shift as the app gets built — when in doubt, read the actual migrations.

## Conventions for working in this repo

- Read `docs/SPEC.md` before any feature work.
- When the spec and reality disagree, the disk wins; surface the discrepancy in your response.
- Don't introduce backend code paths that bypass Edge Functions for third-party calls.
- Don't add dark mode, desktop layouts, or web-specific affordances unless asked.
- Don't use ALL CAPS in UI copy. Sentence case, always.
- Don't add a feature flag, abstraction, or "future-proofing" the spec didn't ask for.
- When something is provisional and you have to make a call, pick the simpler option and note the assumption.
