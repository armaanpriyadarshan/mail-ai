import { useState } from "react";
import { View, Text, Alert } from "react-native";
import { Screen } from "@/components/Screen";
import { TextField } from "@/components/TextField";
import { Button } from "@/components/Button";
import { supabase } from "@/lib/supabase";

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

  // Google OAuth — provisional. Real flow needs supabase.auth.signInWithOAuth
  // wired to a deep link redirect. Stubbed for now.
  const google = () => {
    Alert.alert("Coming soon", "Google sign-in isn't wired up yet.");
  };

  return (
    <Screen>
      <View className="px-card pt-24 pb-8">
        <Text className="text-4xl font-serif text-ink">Mail AI</Text>
        <Text className="text-muted text-base mt-2 leading-6">
          Cold emails that don't feel cold.
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

        <View className="mt-4 gap-3">
          <Button onPress={submit} loading={loading}>
            {mode === "sign-in" ? "Sign in" : "Create account"}
          </Button>
          <Button variant="ghost" onPress={google}>
            Continue with Google
          </Button>
          <Button
            variant="ghost"
            onPress={() => setMode(mode === "sign-in" ? "sign-up" : "sign-in")}
          >
            {mode === "sign-in" ? "New here? Create an account" : "Have an account? Sign in"}
          </Button>
        </View>
      </View>
    </Screen>
  );
}
