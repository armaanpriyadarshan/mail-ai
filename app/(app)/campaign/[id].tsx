import { useState } from "react";
import { View, Text, FlatList, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Header } from "@/components/Header";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { ProgressBar } from "@/components/ProgressBar";
import { useCampaign, useRecipients, useStartCampaign, usePersonalizeEmails } from "@/lib/queries";

export default function CampaignDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: campaign } = useCampaign(id);
  const { data: recipients } = useRecipients(id);
  const start = useStartCampaign();
  const personalize = usePersonalizeEmails();
  const [sending, setSending] = useState(false);

  const total = recipients?.length ?? 0;
  const sent = (recipients ?? []).filter((r) => r.status === "sent").length;
  const failed = (recipients ?? []).filter((r) => r.status === "failed").length;

  const onSend = async () => {
    if (!campaign || !id) return;
    setSending(true);
    try {
      if (campaign.ai_personalize) {
        await personalize.mutateAsync({ campaign_id: id });
      }
      await start.mutateAsync(id);
    } catch (e: any) {
      setSending(false);
      Alert.alert("Couldn't start sending", e?.message ?? "Try again.");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-paper" edges={["top", "left", "right"]}>
      <Header title={campaign?.name ?? "Campaign"} back={() => router.back()} />

      <View className="px-card">
        <Card>
          <View className="flex-row justify-between mb-3">
            <View>
              <Text className="text-muted text-xs">Sent</Text>
              <Text className="text-ink text-2xl font-serif">{sent}</Text>
            </View>
            <View>
              <Text className="text-muted text-xs">Queued</Text>
              <Text className="text-ink text-2xl font-serif">{total - sent - failed}</Text>
            </View>
            <View>
              <Text className="text-muted text-xs">Failed</Text>
              <Text className="text-ink text-2xl font-serif">{failed}</Text>
            </View>
          </View>
          <ProgressBar value={sent} total={total || 1} />
        </Card>
      </View>

      {campaign?.status === "draft" && (
        <View className="px-card mt-4">
          <Button onPress={onSend} loading={sending} disabled={sending}>
            Send campaign
          </Button>
        </View>
      )}

      <FlatList
        data={recipients ?? []}
        keyExtractor={(r) => r.id}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 60, gap: 10 }}
        renderItem={({ item }) => (
          <View className="bg-card border border-line rounded-card p-4 flex-row justify-between items-center">
            <View className="flex-1 pr-3">
              <Text className="text-ink text-base">
                {item.first_name} {item.last_name}
              </Text>
              <Text className="text-muted text-xs mt-1">{item.email}</Text>
            </View>
            <StatusPill status={item.status} />
          </View>
        )}
      />
    </SafeAreaView>
  );
}

function StatusPill({ status }: { status: "queued" | "sent" | "failed" }) {
  const map = {
    queued: { bg: "bg-accentSoft", text: "text-accent", label: "Queued" },
    sent: { bg: "bg-success/20", text: "text-success", label: "Sent" },
    failed: { bg: "bg-danger/20", text: "text-danger", label: "Failed" },
  } as const;
  const m = map[status];
  return (
    <View className={`${m.bg} px-3 py-1 rounded-full`}>
      <Text className={`${m.text} text-xs`}>{m.label}</Text>
    </View>
  );
}
