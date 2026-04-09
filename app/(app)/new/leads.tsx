import { View, Text, Pressable, FlatList } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Header } from "@/components/Header";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { useDraft } from "@/lib/draft-store";

function maskEmail(e: string | null | undefined) {
  if (!e) return "";
  const [local, domain] = e.split("@");
  if (!domain) return e;
  return `${local.slice(0, 2)}•••@${domain}`;
}

export default function Leads() {
  const router = useRouter();
  const draft = useDraft();
  const all = draft.leads;
  const selected = draft.selected;

  const allSelected = all.length > 0 && all.every((l) => l.email && selected.has(l.email));
  const toggleAll = () => {
    if (allSelected) {
      draft.set({ selected: new Set() as any });
    } else {
      draft.set({
        selected: new Set(all.map((l) => l.email!).filter(Boolean)) as any,
      });
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-paper" edges={["top", "left", "right"]}>
      <Header title="Step 2 of 3" back={() => router.back()} />
      <View className="px-card flex-row items-center justify-between mb-2">
        <Text className="text-ink text-base">{selected.size} of {all.length} people</Text>
        <Pressable onPress={toggleAll}>
          <Text className="text-accent">{allSelected ? "Select none" : "Select all"}</Text>
        </Pressable>
      </View>

      <FlatList
        data={all}
        keyExtractor={(item, i) => item.email ?? `i-${i}`}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 140, gap: 12 }}
        renderItem={({ item, index }) => {
          const isSel = item.email ? selected.has(item.email) : false;
          return (
            <Card
              delay={Math.min(index, 8) * 40}
              onPress={() => item.email && draft.toggleSelected(item.email)}
            >
              <View className="flex-row justify-between items-start">
                <View className="flex-1 pr-3">
                  <Text className="text-ink text-base font-medium">
                    {item.first_name} {item.last_name}
                  </Text>
                  <Text className="text-muted text-sm mt-1">
                    {item.title}
                    {item.company ? ` · ${item.company}` : ""}
                  </Text>
                  <Text className="text-muted text-xs mt-2">{maskEmail(item.email)}</Text>
                </View>
                <View
                  className={`w-6 h-6 rounded-full border ${
                    isSel ? "bg-accent border-accent" : "border-line"
                  } items-center justify-center`}
                >
                  {isSel ? <Text className="text-white text-xs">✓</Text> : null}
                </View>
              </View>
            </Card>
          );
        }}
      />

      <View className="absolute bottom-8 left-0 right-0 px-card">
        <Button
          onPress={() => router.push("/(app)/new/compose")}
          disabled={selected.size === 0}
        >
          Next: write email →
        </Button>
      </View>
    </SafeAreaView>
  );
}
