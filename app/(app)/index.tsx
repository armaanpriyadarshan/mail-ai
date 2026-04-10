import { View, Text, Pressable, RefreshControl, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/lib/auth-store";
import { useCampaigns, useRecipientCounts } from "@/lib/queries";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { ProgressBar } from "@/components/ProgressBar";
import { Header } from "@/components/Header";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
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

type Tab = "active" | "history";

const ACTIVE_STATUSES: Campaign["status"][] = ["draft", "sending", "paused"];

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();
  const { data: campaigns, isLoading, refetch } = useCampaigns(user?.id);
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<Tab>("active");

  const active = campaigns?.filter((c) => ACTIVE_STATUSES.includes(c.status)) ?? [];
  const history = campaigns?.filter((c) => !ACTIVE_STATUSES.includes(c.status)) ?? [];
  const visible = tab === "active" ? active : history;

  // Auto-switch to history when a campaign finishes (active count drops).
  const prevActiveCount = useRef(active.length);
  useEffect(() => {
    if (prevActiveCount.current > 0 && active.length < prevActiveCount.current && tab === "active") {
      setTab("history");
    }
    prevActiveCount.current = active.length;
  }, [active.length, tab]);

  // Realtime: invalidate recipient counts whenever any recipient for one of
  // the user's campaigns flips status. The filter scopes the subscription to
  // just the current list so we don't get updates for other users.
  useEffect(() => {
    if (!campaigns || campaigns.length === 0) return;
    const ids = campaigns.map((c) => c.id);
    const channelName = `home-recipients-${ids.sort().join(",")}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "recipients" },
        (payload: any) => {
          const cid = payload.new?.campaign_id ?? payload.old?.campaign_id;
          if (cid && ids.includes(cid)) {
            queryClient.invalidateQueries({ queryKey: ["recipient-counts", cid] });
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "campaigns" },
        (payload: any) => {
          if (payload.new?.user_id === user?.id) {
            queryClient.invalidateQueries({ queryKey: ["campaigns", user?.id] });
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [campaigns, queryClient, user?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    // Also refetch each card's counts.
    await queryClient.invalidateQueries({ queryKey: ["recipient-counts"] });
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

      {!isLoading && (campaigns?.length ?? 0) > 0 && (
        <View className="flex-row px-card mb-2 gap-2">
          {(["active", "history"] as Tab[]).map((t) => (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              className={`px-4 py-2 rounded-full ${tab === t ? "bg-accent" : "bg-line"}`}
            >
              <Text className={`text-sm font-medium ${tab === t ? "text-white" : "text-muted"}`}>
                {t === "active" ? `Active (${active.length})` : `History (${history.length})`}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {!isLoading && (campaigns?.length ?? 0) === 0 ? (
          <EmptyState
            title="Start your first campaign"
            body="Tell us who you want to reach. We'll find them and help you write."
            cta={
              <View className="w-full px-card mt-2">
                <Button onPress={() => router.push("/(app)/new/contacts")}>
                  Start a campaign
                </Button>
              </View>
            }
          />
        ) : visible.length === 0 ? (
          <View className="px-card pt-8 items-center">
            <Text className="text-muted text-base">
              {tab === "active" ? "No active campaigns" : "No completed campaigns yet"}
            </Text>
          </View>
        ) : (
          <View className="px-card gap-4 pt-2">
            {visible.map((c, i) => (
              <CampaignCard key={c.id} c={c} delay={i * 60} />
            ))}
          </View>
        )}
      </ScrollView>

      {(campaigns?.length ?? 0) > 0 ? (
        <View className="absolute bottom-8 right-card">
          <Pressable
            onPress={() => router.push("/(app)/new/contacts")}
            className="bg-accent w-16 h-16 rounded-full items-center justify-center"
            style={{ shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } }}
          >
            <Ionicons name="add" size={32} color="#ffffff" />
          </Pressable>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function CampaignCard({ c, delay }: { c: Campaign; delay: number }) {
  const router = useRouter();
  const { data: counts } = useRecipientCounts(c.id);
  const total = counts?.total ?? 0;
  const sent = counts?.sent ?? 0;

  return (
    <Card delay={delay} onPress={() => router.push(`/(app)/campaign/${c.id}`)}>
      <View className="flex-row justify-between items-start mb-3">
        <Text className="text-lg text-ink font-medium flex-1 pr-3">{c.name}</Text>
        <View className="bg-accentSoft px-3 py-1 rounded-full">
          <Text className="text-accent text-xs">{statusLabel(c.status)}</Text>
        </View>
      </View>
      <Text className="text-muted text-sm mb-4">{total} recipients</Text>
      <ProgressBar value={sent} total={total || 1} />
      <Text className="text-muted text-xs mt-2">
        {sent} of {total} sent
      </Text>
    </Card>
  );
}
