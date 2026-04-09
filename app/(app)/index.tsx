import { View, Text, Pressable, RefreshControl, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/lib/auth-store";
import { useCampaigns } from "@/lib/queries";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { ProgressBar } from "@/components/ProgressBar";
import { Header } from "@/components/Header";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Campaign } from "@/lib/types";

function statusLabel(s: Campaign["status"]) {
  return {
    draft: "Draft",
    sending: "Sending",
    paused: "Paused",
    completed: "Sent",
    failed: "Failed",
  }[s];
}

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();
  const { data: campaigns, isLoading, refetch } = useCampaigns(user?.id);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  return (
    <SafeAreaView className="flex-1 bg-paper" edges={["top", "left", "right"]}>
      <Header
        title="Mail AI"
        right={
          <Pressable onPress={() => router.push("/(app)/settings")} className="p-2">
            <Text className="text-2xl">⚙︎</Text>
          </Pressable>
        }
      />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {!isLoading && (campaigns?.length ?? 0) === 0 ? (
          <EmptyState
            title="Start your first campaign"
            body="Tell us who you want to reach. We'll find them and help you write."
            cta={
              <View className="w-full px-card mt-2">
                <Button onPress={() => router.push("/(app)/new/audience")}>
                  Start a campaign
                </Button>
              </View>
            }
          />
        ) : (
          <View className="px-card gap-4 pt-2">
            {campaigns?.map((c, i) => (
              <CampaignCard key={c.id} c={c} delay={i * 60} />
            ))}
          </View>
        )}
      </ScrollView>

      {(campaigns?.length ?? 0) > 0 ? (
        <View className="absolute bottom-8 right-card">
          <Pressable
            onPress={() => router.push("/(app)/new/audience")}
            className="bg-accent w-16 h-16 rounded-full items-center justify-center"
            style={{ shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } }}
          >
            <Text className="text-white text-3xl">+</Text>
          </Pressable>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function CampaignCard({ c, delay }: { c: Campaign; delay: number }) {
  const router = useRouter();
  const [counts, setCounts] = useState<{ total: number; sent: number } | null>(null);

  // Fire-and-forget recipient counts. Cheap enough to do per card for v1.
  if (counts === null) {
    supabase
      .from("recipients")
      .select("status", { count: "exact" })
      .eq("campaign_id", c.id)
      .then(({ data }) => {
        const total = data?.length ?? 0;
        const sent = (data ?? []).filter((r: any) => r.status === "sent").length;
        setCounts({ total, sent });
      });
  }

  return (
    <Card delay={delay} onPress={() => router.push(`/(app)/campaign/${c.id}`)}>
      <View className="flex-row justify-between items-start mb-3">
        <Text className="text-lg text-ink font-medium flex-1 pr-3">{c.name}</Text>
        <View className="bg-accentSoft px-3 py-1 rounded-full">
          <Text className="text-accent text-xs">{statusLabel(c.status)}</Text>
        </View>
      </View>
      <Text className="text-muted text-sm mb-4">
        {counts?.total ?? "…"} recipients
      </Text>
      <ProgressBar value={counts?.sent ?? 0} total={counts?.total ?? 1} />
      <Text className="text-muted text-xs mt-2">
        {counts?.sent ?? 0} of {counts?.total ?? 0} sent
      </Text>
    </Card>
  );
}
