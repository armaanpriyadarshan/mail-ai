import { useState } from "react";
import { View, Text, Alert, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { Screen } from "@/components/Screen";
import { TextField } from "@/components/TextField";
import { Button } from "@/components/Button";
import { supabase } from "@/lib/supabase";

WebBrowser.maybeCompleteAuthSession();

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email || !password) return;
    setLoading(true);
    const { error } =
      mode === "sign-in"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) Alert.alert("Hmm", error.message);
  };

  const google = async () => {
    setLoading(true);
    try {
      // No Expo proxy. Linking.createURL returns the current runtime's deep link:
      //   Expo Go → exp://<lan-ip>:8081/--/auth/callback
      //   dev build → mailai://auth/callback
      // Both must be allowed in Supabase (Redirect URLs supports `exp://**` and
      // `mailai://**` wildcards).
      const redirectTo = Linking.createURL("/auth/callback");

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (error) throw error;
      if (!data?.url) throw new Error("no auth url");

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type !== "success" || !result.url) {
        return; // user closed the sheet
      }

      // Supabase returns tokens in the URL fragment.
      const fragment = result.url.split("#")[1] ?? "";
      const params = new URLSearchParams(fragment);
      const access_token = params.get("access_token");
      const refresh_token = params.get("refresh_token");
      if (!access_token || !refresh_token) throw new Error("missing tokens in callback");

      const { error: setErr } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });
      if (setErr) throw setErr;
    } catch (e: any) {
      Alert.alert("Sign-in failed", e?.message ?? "Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <View className="px-card pt-24 pb-8">
        <Text className="text-4xl font-serif text-ink">Mail AI</Text>
        <Text className="text-muted text-base mt-2 leading-6">
          Automated cold emailing with AI
        </Text>
      </View>

      <View className="px-card gap-4">
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="you@example.com"
        />
        <TextField
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••••"
        />

        <View className="mt-4 gap-4">
          <Button onPress={submit} loading={loading}>
            {mode === "sign-in" ? "Sign in" : "Create account"}
          </Button>

          <View className="flex-row items-center my-1">
            <View className="flex-1 h-px bg-line" />
            <Text className="text-muted text-sm mx-3">or</Text>
            <View className="flex-1 h-px bg-line" />
          </View>

          <Button variant="ghost" onPress={google}>
            <View className="flex-row items-center">
              <Ionicons name="logo-google" size={18} color="#1F1B16" />
              <Text className="text-ink text-base font-medium ml-3">
                Continue with Google
              </Text>
            </View>
          </Button>

          <Pressable
            onPress={() => setMode(mode === "sign-in" ? "sign-up" : "sign-in")}
            className="items-center mt-2"
          >
            <Text className="text-muted text-sm">
              {mode === "sign-in" ? (
                <>
                  New here? <Text className="text-accent">Create an account</Text>
                </>
              ) : (
                <>
                  Have an account? <Text className="text-accent">Sign in</Text>
                </>
              )}
            </Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}
