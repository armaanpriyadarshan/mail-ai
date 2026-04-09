import { useState } from "react";
import { View, Text, Alert, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Screen } from "@/components/Screen";
import { Header } from "@/components/Header";
import { TextField } from "@/components/TextField";
import { Button } from "@/components/Button";
import { useDraft } from "@/lib/draft-store";
import { useSearchLeads } from "@/lib/queries";

export default function Audience() {
  const router = useRouter();
  const draft = useDraft();
  const [showFilters, setShowFilters] = useState(false);
  const search = useSearchLeads();

  const onFind = async () => {
    if (!draft.audienceQuery.trim()) return;
    try {
      const res = await search.mutateAsync({
        query: draft.audienceQuery,
        filters: draft.filters,
      });
      draft.set({ leads: res.leads, selected: new Set(res.leads.map((l) => l.email!).filter(Boolean)) as any });
      router.push("/(app)/new/leads");
    } catch (e: any) {
      if (e?.message?.includes("lead_limit_reached")) {
        Alert.alert("You're out of lookups", "Upgrade to Pro to find more people this month.");
      } else {
        Alert.alert("Couldn't search", e?.message ?? "Try again in a moment.");
      }
    }
  };

  return (
    <Screen>
      <Header title="Step 1 of 3" back={() => router.back()} />
      <View className="px-card">
        <Text className="text-3xl font-serif text-ink mb-6 leading-9">
          Who do you want to reach?
        </Text>
        <TextField
          large
          multiline
          value={draft.audienceQuery}
          onChangeText={(v) => draft.set({ audienceQuery: v })}
          placeholder="e.g. startup founders in SF, marketing managers at e-commerce companies"
          style={{ minHeight: 120, textAlignVertical: "top" }}
        />

        <Pressable onPress={() => setShowFilters((v) => !v)} className="mt-4 mb-2">
          <Text className="text-accent">
            {showFilters ? "Hide" : "Add"} filters
          </Text>
        </Pressable>

        {showFilters ? (
          <View className="gap-3">
            <TextField
              label="Location"
              value={draft.filters.location ?? ""}
              onChangeText={(v) => draft.set({ filters: { ...draft.filters, location: v } })}
              placeholder="San Francisco"
            />
            <TextField
              label="Company size"
              value={draft.filters.companySize ?? ""}
              onChangeText={(v) =>
                draft.set({ filters: { ...draft.filters, companySize: v } })
              }
              placeholder="11,50"
            />
            <TextField
              label="Job titles (comma-separated)"
              value={draft.filters.jobTitles ?? ""}
              onChangeText={(v) =>
                draft.set({ filters: { ...draft.filters, jobTitles: v } })
              }
              placeholder="founder, ceo"
            />
          </View>
        ) : null}

        <View className="mt-8">
          <Button onPress={onFind} loading={search.isPending}>
            Find people →
          </Button>
        </View>
      </View>
    </Screen>
  );
}
