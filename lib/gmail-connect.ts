// Connects a user's Gmail so Mail AI can send on their behalf.
//
// Approach: piggyback on Supabase's Google OAuth provider, request the
// gmail.send scope, then pull `provider_token` / `provider_refresh_token`
// out of the redirect fragment and save them on the profile.
//
// This avoids talking to Google directly from the client (which can't use
// an `exp://` deep link as a redirect URI — Google only allows https) and
// reuses the same deep-link flow that sign-in uses.
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { supabase } from "./supabase";

WebBrowser.maybeCompleteAuthSession();

interface ConnectResult {
  ok: boolean;
  error?: string;
  gmail_email?: string;
}

export function useGmailConnect() {
  const connect = async (): Promise<ConnectResult> => {
    try {
      const redirectTo = Linking.createURL("/auth/callback");

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          scopes: "https://www.googleapis.com/auth/gmail.send",
          // offline + consent is what forces Google to issue a refresh token
          // instead of just an access token.
          queryParams: { access_type: "offline", prompt: "consent" },
          skipBrowserRedirect: true,
        },
      });
      if (error) throw error;
      if (!data?.url) throw new Error("no auth url");

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type !== "success" || !result.url) {
        return { ok: false, error: "cancelled" };
      }

      // Parse tokens out of the URL fragment.
      const fragment = result.url.split("#")[1] ?? "";
      const params = new URLSearchParams(fragment);
      const access_token = params.get("access_token");
      const refresh_token = params.get("refresh_token");
      const provider_token = params.get("provider_token");
      const provider_refresh_token = params.get("provider_refresh_token");
      const expires_in = Number(params.get("expires_in") ?? "3600");

      if (!access_token || !refresh_token) {
        throw new Error("missing Supabase session tokens");
      }
      if (!provider_token || !provider_refresh_token) {
        throw new Error(
          "Google didn't return a refresh token. Revoke Mail AI in your Google account permissions and try again.",
        );
      }

      // Apply the new Supabase session so the profile update below runs as
      // the current user.
      const { error: setErr } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });
      if (setErr) throw setErr;

      // Look up the Gmail address from Google's userinfo endpoint.
      const userinfo = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${provider_token}` },
      });
      const gmail_email = userinfo.ok ? (await userinfo.json()).email : null;

      // Save the Google tokens on the profile. RLS lets the user update their own row.
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("not signed in");

      const { error: pErr } = await supabase
        .from("profiles")
        .update({
          gmail_email,
          gmail_access_token: provider_token,
          gmail_refresh_token: provider_refresh_token,
          gmail_token_expires_at: new Date(Date.now() + expires_in * 1000).toISOString(),
        })
        .eq("id", userId);
      if (pErr) throw pErr;

      return { ok: true, gmail_email };
    } catch (e: any) {
      return { ok: false, error: e?.message ?? "unknown error" };
    }
  };

  return { connect };
}
