import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

interface Props {
  step: number; // 1-indexed
  total: number;
}

// Minimal progress header for the new-campaign wizard — a back chevron, a
// filled bar, and "step N of M" text. Replaces the plain "Step N of M" Header
// on the wizard screens so the flow feels continuous.
export function WizardProgress({ step, total }: Props) {
  const router = useRouter();
  const pct = Math.max(0, Math.min(100, Math.round((step / total) * 100)));

  return (
    <View className="px-card pt-card pb-4">
      <View className="flex-row items-center mb-3">
        <Pressable onPress={() => router.back()} className="p-1 mr-2">
          <Ionicons name="chevron-back" size={24} color="#1F1B16" />
        </Pressable>
        <Text className="text-muted text-sm">
          Step {step} of {total}
        </Text>
      </View>
      <View className="h-1.5 bg-line rounded-full overflow-hidden">
        <View className="h-full bg-accent rounded-full" style={{ width: `${pct}%` }} />
      </View>
    </View>
  );
}
