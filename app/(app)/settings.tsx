import { View, Text, Alert, Linking } from "react-native";
import { useRouter } from "expo-router";
import { Screen } from "@/components/Screen";
import { Header } from "@/components/Header";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { ProgressBar } from "@/components/ProgressBar";
import { useAuth } from "@/lib/auth-store";
import { useProfile, useUpdateProfile, useCreateCheckout } from "@/lib/queries";
import { useGmailConnect } from "@/lib/gmail-connect";
import { LIMITS } from "@/lib/usage";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Settings() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const update = useUpdateProfile(user?.id);
  const checkout = useCreateCheckout();
  const gmail = useGmailConnect();

  const [signature, setSignature] = useState("");
  const [limit, setLimit] = useState("50");
  const [usage, setUsage] = useState({ emails_sent: 0, leads_searched: 0 });

  useEffect(() => {
    if (profile) {
      setSignature(profile.default_signature ?? "");
      setLimit(String(profile.daily_send_limit));
    }
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    const month = new Date().toISOString().slice(0, 7);
    supabase
      .from("usage")
      .select("*")
      .eq("user_id", user.id)
      .eq("month", month)
      .maybeSingle()
      .then(({ data }) =>
        setUsage({
          emails_sent: data?.emails_sent ?? 0,
          leads_searched: data?.leads_searched ?? 0,
        }),
      );
  }, [user]);

  const tier = profile?.subscription_tier ?? "free";
  const limits = LIMITS[tier];

  const onConnect = async () => {
    const res = await gmail.connect();
    if (!res.ok) Alert.alert("Couldn't connect", "Try again from a moment.");
  };

  const onUpgrade = async () => {
    try {
      const { url } = await checkout.mutateAsync();
      Linking.openURL(url);
    } catch (e: any) {
      Alert.alert("Couldn't open checkout", e?.message ?? "");
    }
  };

  const save = () => {
    update.mutate({
      default_signature: signature,
      daily_send_limit: Math.max(1, Math.min(500, parseInt(limit || "50", 10))),
    });
  };

  return (
    <Screen>
      <Header title="Settings" back={() => router.back()} />

      <View className="px-card gap-4">
        <Card>
          <Text className="text-muted text-xs mb-1">Connected Gmail</Text>
          <Text className="text-ink text-base mb-3">{profile?.gmail_email ?? "Not connected"}</Text>
          {profile?.gmail_email ? (
            <Button
              variant="ghost"
              onPress={() =>
                update.mutate({
                  gmail_email: null,
                } as any)
              }
            >
              Disconnect
            </Button>
          ) : (
            <Button onPress={onConnect}>Connect Gmail</Button>
          )}
        </Card>

        <Card>
          <Text className="text-muted text-xs mb-2">Daily send limit</Text>
          <TextField value={limit} onChangeText={setLimit} keyboardType="number-pad" />
          <Text className="text-muted text-xs mt-2">Default 50, max 500.</Text>
        </Card>

        <Card>
          <Text className="text-muted text-xs mb-2">Default signature</Text>
          <TextField
            value={signature}
            onChangeText={setSignature}
            multiline
            style={{ minHeight: 80, textAlignVertical: "top" }}
            placeholder="— Your name"
          />
        </Card>

        <Button onPress={save} loading={update.isPending}>
          Save changes
        </Button>

        <Card>
          <Text className="text-muted text-xs mb-3">Usage this month</Text>
          <View className="mb-4">
            <View className="flex-row justify-between mb-1">
              <Text className="text-ink">Emails sent</Text>
              <Text className="text-muted text-sm">
                {usage.emails_sent} / {limits.emails}
              </Text>
            </View>
            <ProgressBar value={usage.emails_sent} total={limits.emails} />
          </View>
          <View>
            <View className="flex-row justify-between mb-1">
              <Text className="text-ink">Leads searched</Text>
              <Text className="text-muted text-sm">
                {usage.leads_searched} / {limits.leads}
              </Text>
            </View>
            <ProgressBar value={usage.leads_searched} total={limits.leads} />
          </View>
        </Card>

        <Card>
          <Text className="text-muted text-xs mb-1">Plan</Text>
          <Text className="text-ink text-base mb-3">{tier === "pro" ? "Pro" : "Free"}</Text>
          {tier === "free" ? (
            <Button onPress={onUpgrade} loading={checkout.isPending}>
              Upgrade to Pro
            </Button>
          ) : null}
        </Card>

        <Button variant="ghost" onPress={signOut}>
          Sign out
        </Button>
      </View>
    </Screen>
  );
}
