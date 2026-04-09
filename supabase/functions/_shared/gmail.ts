// Gmail send + token refresh helpers.
import { adminClient } from "./supabase.ts";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SEND_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";

interface Profile {
  id: string;
  gmail_email: string | null;
  gmail_access_token: string | null;
  gmail_refresh_token: string | null;
  gmail_token_expires_at: string | null;
}

async function refreshIfNeeded(profile: Profile): Promise<string> {
  const now = Date.now();
  const exp = profile.gmail_token_expires_at
    ? new Date(profile.gmail_token_expires_at).getTime()
    : 0;
  if (profile.gmail_access_token && exp - 60_000 > now) {
    return profile.gmail_access_token;
  }
  if (!profile.gmail_refresh_token) {
    throw new Error("no refresh token");
  }
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: Deno.env.get("GOOGLE_CLIENT_ID")!,
      client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
      refresh_token: profile.gmail_refresh_token,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`refresh failed: ${await res.text()}`);
  const tokens = await res.json();
  const expiresAt = new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString();
  await adminClient()
    .from("profiles")
    .update({
      gmail_access_token: tokens.access_token,
      gmail_token_expires_at: expiresAt,
    })
    .eq("id", profile.id);
  return tokens.access_token;
}

function buildRawMessage(opts: {
  from: string;
  to: string;
  subject: string;
  body: string;
}): string {
  const lines = [
    `From: ${opts.from}`,
    `To: ${opts.to}`,
    `Subject: ${opts.subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "",
    opts.body,
  ];
  // Base64url encode for Gmail API.
  const utf8 = new TextEncoder().encode(lines.join("\r\n"));
  let bin = "";
  for (const b of utf8) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function sendGmail(profile: Profile, to: string, subject: string, body: string) {
  const accessToken = await refreshIfNeeded(profile);
  const raw = buildRawMessage({
    from: profile.gmail_email ?? "me",
    to,
    subject,
    body,
  });
  const res = await fetch(SEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw }),
  });
  if (!res.ok) {
    throw new Error(`gmail send failed: ${res.status} ${await res.text()}`);
  }
  return await res.json();
}
