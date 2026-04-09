// Kicks off the user-facing Gmail OAuth flow with expo-auth-session, then hands the
// returned auth code to the gmail-oauth Edge Function for token exchange.
//
// Uses the Expo auth proxy (https://auth.expo.io/@<owner>/<slug>) so we can develop in
// Expo Go with a single Web OAuth client in Google Cloud Console — no dev build required.
//
// Google Cloud Console setup (Web application client):
//   Authorized JavaScript origins: https://auth.expo.io
//   Authorized redirect URIs:      https://auth.expo.io/@<expo-username>/mail-ai
//
// Set EXPO_PUBLIC_EXPO_USERNAME in .env.local to your Expo account username
// (run `npx expo whoami` to find it). The slug `mail-ai` comes from app.json.
//
// Heads up: Expo has been deprecating the auth proxy. If/when it stops working, switch
// to a dev build with `expo-dev-client`, drop `projectNameForProxy`, and use the native
// scheme — at which point you'll need separate iOS + Android OAuth clients in Google.
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { supabase } from "./supabase";

WebBrowser.maybeCompleteAuthSession();

const discovery = {
  authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenEndpoint: "https://oauth2.googleapis.com/token",
  revocationEndpoint: "https://oauth2.googleapis.com/revoke",
};

export function useGmailConnect() {
  const clientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? "";
  const expoUsername = process.env.EXPO_PUBLIC_EXPO_USERNAME ?? "";

  // Forces the Expo auth proxy URL: https://auth.expo.io/@<owner>/<slug>
  const redirectUri = AuthSession.makeRedirectUri({
    projectNameForProxy: expoUsername ? `@${expoUsername}/mail-ai` : undefined,
  });

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId,
      redirectUri,
      scopes: ["https://www.googleapis.com/auth/gmail.send"],
      responseType: AuthSession.ResponseType.Code,
      extraParams: { access_type: "offline", prompt: "consent" },
    },
    discovery,
  );

  const connect = async () => {
    const result = await promptAsync();
    if (result.type !== "success" || !result.params.code) return { ok: false as const };
    const { error } = await supabase.functions.invoke("gmail-oauth", {
      body: { code: result.params.code, redirectUri },
    });
    return { ok: !error, error };
  };

  return { connect, ready: !!request, response };
}
