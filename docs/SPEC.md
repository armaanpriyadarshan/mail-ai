# Mail AI — Product Spec

> **Provisional document.** This spec captures the intended shape of the product. Names, fields, tiers, and integration details are likely to change as the app is built. When the code disagrees with this document, the code is correct — update the spec.

## What this is

A mobile-first cold email tool for non-technical people. The user describes who they want to reach, writes or AI-generates an email template, the app finds matching contacts via Apollo.io, and sends personalized emails through their connected Gmail. React Native / Expo app with Supabase as the entire backend.

The name is **Mail AI**. The product philosophy is **simple, not minimal** — every screen does one thing, the UI is warm and readable, there's no hidden complexity, but it doesn't feel sterile or stripped-down.

---

## Design direction

**Tone: "Friendly command center."** Not a dashboard, not a settings panel. It should feel like texting a smart assistant that happens to send emails for you. Think iMessage meets a really good form.

**Typography.** Clean and soulful — like reading a well-typeset email, not a tech product. No uppercase headers. Sentence case everywhere. Generous line heights. Free fonts (Google Fonts or Fontsource). _Specific font choice TBD._

**Color.** Warm, not sterile. Think good stationery, not a SaaS dashboard. One confident accent color for actions. **No dark mode for v1.** _Exact palette TBD._

**Layout.**
- Big touch targets, lots of vertical breathing room
- Single-column everything — no side-by-side on mobile
- Cards with `16px` padding and `12px` border-radius
- Bottom sheet modals over full-screen navigations where possible
- Progress feels linear: step 1 → 2 → 3 → done

**Micro-interactions.**
- Buttons: scale to 0.97 on press with a 120ms spring
- Cards: subtle fade-in on mount with staggered delays
- Send action: satisfying checkmark animation (Lottie or Reanimated — TBD)
- Pull-to-refresh on the campaign list

---

## Auth & payments

**Authentication.** Supabase Auth with email/password and Google OAuth as sign-in methods. Gmail connection for sending is a **separate** OAuth flow that happens post-signup, stored server-side in the user's profile, not used for auth.

**Payment model (v2 — architect for it now).**
- Free tier: 50 emails/month, 100 lead lookups/month
- Pro tier: 1,000 emails/month, 2,000 lead lookups/month
- Track usage in a `usage` table with monthly counters
- Stripe via Supabase Edge Function webhook
- Gate inline in the UI when a limit is hit — no paywall splash

> All numeric limits and the free/pro split are provisional and likely to change before launch.

---

## Screens & user flow

### 1. Auth
- Email + password form, or "Continue with Google"
- After first sign-in, prompt to connect Gmail (separate OAuth)
- If Gmail isn't connected, the app is browsable but "Send" is disabled with a connect prompt

### 2. Home — campaign list
- Header: "Mail AI" wordmark + settings gear
- Empty state: friendly illustration + "Start your first campaign" CTA
- Each campaign card: name, status (draft / sending / sent), recipient count, sent/total progress bar
- FAB or top-right "+" to create

### 3. New campaign — step 1: audience
- Single large text input: "Who do you want to reach?"
- Placeholder: _"e.g. startup founders in SF, marketing managers at e-commerce companies"_
- Optional expandable filters: location, company size, job title keywords
- "Find People →"

### 4. New campaign — step 2: review leads
- List of contacts: name, title, company, email (partially masked until send)
- Checkboxes to deselect
- Top bar: "42 people found" + Select All / None
- "Next: Write Email →"

### 5. New campaign — step 3: compose
- To field shows: "42 recipients"
- Subject line input
- Body textarea — large, comfortable
- "✨ Help me write" → bottom sheet:
  - "What's the goal of this email?"
  - "What's your offer / context?"
  - "Generate" → AI populates compose fields
- Personalization tokens as tappable chips: `{first_name}`, `{company}`, `{title}`
- Toggle: "Personalize each email with AI" (per-recipient rewrite vs. plain variable substitution)
- "Preview" → 3 sample rendered emails in a horizontal pager
- "Send Campaign →"

### 6. Campaign detail / status
- Real-time send progress (Supabase Realtime on `recipients`)
- Recipient list with status: queued / sent / failed
- Summary stats at top: total, sent, failed

### 7. Settings
- Connected Gmail account (with disconnect)
- Daily send limit slider (default 50, max 500)
- Default signature textarea
- Usage stats: emails sent / limit, leads looked up / limit
- Subscription tier + upgrade button
- About / support link

---

## Tech stack

| Layer        | Choice                                    | Why                                       |
| ------------ | ----------------------------------------- | ----------------------------------------- |
| App          | Expo + Expo Router                        | File-based routing, OTA, easiest RN DX    |
| Styling      | Nativewind                                | Tailwind on RN, fast iteration            |
| State        | Zustand + TanStack React Query            | Local + server cache                      |
| Auth         | Supabase Auth                             | Email/password + Google OAuth             |
| Database     | Supabase Postgres                         | All data lives here                       |
| Realtime     | Supabase Realtime                         | Live send progress                        |
| Server logic | Supabase Edge Functions (Deno)            | Hides API keys                            |
| Send queue   | Supabase pg_cron + Edge Function          | Polls `recipients` every 30–60s           |
| Leads        | Apollo.io API (via Edge Function)         | Best free tier (10k credits/mo)           |
| Sending      | Gmail API (via Edge Function)             | Better deliverability than SMTP           |
| AI           | OpenAI `gpt-4o-mini` (via Edge Function)  | Cheap, fast, good for email copy          |
| Payments     | Stripe (via Edge Function webhook)        | Subscriptions + usage gating              |
| Hosting      | Expo EAS + Supabase                       | Two services total                        |

> The spec originally called for **Expo SDK 52**. The repo currently has **Expo SDK 54** installed — assume that's the target unless we explicitly downgrade. Specific library choices (Lottie vs. Reanimated for animations, font, color tokens, etc.) are still TBD.

---

## Edge functions (provisional surface)

- **`gmail-oauth`** — Handles Gmail OAuth token exchange and refresh. Stores tokens in `profiles`. Never exposes tokens to the client.
- **`search-leads`** — Audience query + filters → Apollo `/people/search`. Returns formatted results. Increments usage counter. Should consult `leads_cache` first.
- **`generate-email`** — Goal, context, optional tone → OpenAI → subject + body draft.
- **`personalize-emails`** — Template + recipient list → per-recipient rewrites written to `recipients`.
- **`send-batch`** — Called by `pg_cron`. Picks the next N queued recipients respecting `daily_send_limit` and 30–60s spacing. Sends via Gmail API. Updates status. Stops on Gmail errors and retries next day.
- **`stripe-webhook`** — Subscription events → updates `subscription_tier`, resets usage counters on billing cycle.
- **`create-checkout`** — Creates a Stripe checkout session for upgrading to Pro.

---

## Data model

> All schemas below are provisional. Field names and types are likely to change once migrations are written.

**`profiles`** — extends Supabase Auth users
- `gmail_access_token`, `gmail_refresh_token`, `gmail_email`
- `daily_send_limit` (default `50`)
- `default_signature`
- `stripe_customer_id`
- `subscription_tier` (`free` | `pro`)
- `created_at`

**`campaigns`**
- `user_id` → `profiles`
- `name`, `status` (`draft` | `sending` | `paused` | `completed` | `failed`)
- `subject_template`, `body_template`
- `ai_personalize` (boolean)
- `audience_query`
- `created_at`

**`recipients`**
- `campaign_id` → `campaigns`
- `email`, `first_name`, `last_name`, `company`, `title`
- `personalized_subject`, `personalized_body`
- `status` (`queued` | `sent` | `failed`)
- `sent_at`, `error`

**`usage`**
- `user_id` → `profiles`
- `month` (e.g. `"2026-04"`)
- `emails_sent` (counter)
- `leads_searched` (counter)

**`leads_cache`** _(implied by Apollo notes — schema TBD)_
- Keyed on a normalized query so duplicate searches don't burn credits.

---

## Key integration notes

**Gmail OAuth.** `expo-auth-session` on mobile. The `gmail-oauth` Edge Function handles token exchange and refresh. Tokens stored in `profiles`, never on device. Request `gmail.send` scope only.

**Apollo.io.** Free tier: 10,000 credits/month. Proxied through an Edge Function so users never need an Apollo account. Cache results in `leads_cache` to avoid duplicate credit burns.

**Rate limiting.** Gmail caps at ~500/day (consumer), ~2000/day (Workspace). The `pg_cron` job runs every 30–60 seconds, picks queued recipients with randomized spacing, respects `daily_send_limit`, stops on Gmail errors and retries next day.

**Realtime.** The campaign detail screen subscribes to Supabase Realtime on `recipients` filtered by `campaign_id`. Status updates appear live as emails send.

**OpenAI.** `gpt-4o-mini` for both template generation and per-recipient personalization. Keep prompts tight — email copy doesn't need a large model.
