# Setup

> Provisional. Most of this hasn't been run end-to-end yet — treat it as a checklist, not a guarantee.

## 1. Install deps

```bash
npm install
```

The new `package.json` adds: expo-router, nativewind + tailwindcss, @supabase/supabase-js, @react-native-async-storage/async-storage, @tanstack/react-query, zustand, expo-auth-session, expo-web-browser, react-native-reanimated, react-native-gesture-handler, react-native-safe-area-context, react-native-screens, react-native-url-polyfill.

## 2. Env vars

Copy `.env.example` to `.env.local` (already gitignored) and fill in:

```
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
EXPO_PUBLIC_GOOGLE_CLIENT_ID=...   # only needed once Gmail connect is wired
```

Server-side secrets (`OPENAI_API_KEY`, `APOLLO_API_KEY`, `GOOGLE_CLIENT_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_PRO_PRICE_ID`, etc.) live in the Supabase dashboard under **Project Settings → Edge Functions → Secrets**. Never put them in the client.

## 3. Database

Run migrations from the repo root:

```bash
supabase link --project-ref <your-ref>
supabase db push
```

This applies `supabase/migrations/0001_init.sql` (tables + RLS) and `0002_send_cron.sql` (pg_cron schedule).

For the cron job to actually call `send-batch`, you need to seed two Vault secrets first:

```sql
select vault.create_secret('https://<ref>.supabase.co/functions/v1/send-batch', 'send_batch_url');
select vault.create_secret('<service-role-key>', 'service_role_key');
```

## 4. Edge Functions

Deploy each function:

```bash
supabase functions deploy gmail-oauth
supabase functions deploy search-leads
supabase functions deploy generate-email
supabase functions deploy personalize-emails
supabase functions deploy send-batch
supabase functions deploy create-checkout
supabase functions deploy stripe-webhook --no-verify-jwt
```

`stripe-webhook` is the only one that should accept unauthenticated requests (Stripe calls it directly).

## 5. Run the app

```bash
npm start
```

Then press `i` for iOS simulator or `a` for Android.

## What's not done

- Google sign-in on the auth screen (button is stubbed with an Alert).
- Stripe webhook signature verification.
- Real Apollo response shape — the field mapping in `search-leads` is a guess.
- Lottie/Reanimated send-success animation.
- Font choice — using system font as a placeholder.
- Real illustration in the empty state — currently an emoji.
- Tests of any kind.
