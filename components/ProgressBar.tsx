import { View } from "react-native";

export function ProgressBar({ value, total }: { value: number; total: number }) {
  const pct = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
  return (
    <View className="h-2 bg-line rounded-full overflow-hidden w-full">
      <View className="h-full bg-accent rounded-full" style={{ width: `${pct}%` }} />
    </View>
  );
}
