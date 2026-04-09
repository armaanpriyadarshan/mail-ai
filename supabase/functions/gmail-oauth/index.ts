// gmail-oauth — exchanges an auth code for tokens and stores them on the profile.
// Called by the mobile client right after expo-auth-session completes the user-facing flow.
//
// Provisional. Untested end-to-end.
import { preflight, json } from "../_shared/cors.ts";
import { adminClient, getUserId } from "../_shared/supabase.ts";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const PROFILE_URL = "https://gmail.googleapis.com/gmail/v1/users/me/profile";

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  const userId = await getUserId(req);
  if (!userId) return json({ error: "unauthorized" }, { status: 401 });

  const { code, redirectUri } = await req.json().catch(() => ({}));
  if (!code || !redirectUri) {
    return json({ error: "missing code or redirectUri" }, { status: 400 });
  }

  const clientId = Deno.env.get("GOOGLE_CLIENT_ID")!;
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET")!;

  // Exchange the code for tokens.
  const tokenRes = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok) {
    return json({ error: "token exchange failed", details: await tokenRes.text() }, { status: 400 });
  }
  const tokens = await tokenRes.json();

  // Look up the connected Gmail address.
  const profileRes = await fetch(PROFILE_URL, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const profile = profileRes.ok ? await profileRes.json() : { emailAddress: null };

  const expiresAt = new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString();

  const sb = adminClient();
  const { error } = await sb
    .from("profiles")
    .update({
      gmail_access_token: tokens.access_token,
      gmail_refresh_token: tokens.refresh_token,
      gmail_token_expires_at: expiresAt,
      gmail_email: profile.emailAddress,
    })
    .eq("id", userId);

  if (error) return json({ error: error.message }, { status: 500 });
  return json({ ok: true, gmail_email: profile.emailAddress });
});
