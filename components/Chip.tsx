import { Pressable, Text } from "react-native";

interface Props {
  label: string;
  onPress?: () => void;
  active?: boolean;
}

export function Chip({ label, onPress, active }: Props) {
  return (
    <Pressable
      onPress={onPress}
      className={`px-3 py-2 rounded-full mr-2 mb-2 ${
        active ? "bg-accent" : "bg-accentSoft"
      }`}
    >
      <Text className={`text-sm ${active ? "text-white" : "text-accent"}`}>{label}</Text>
    </Pressable>
  );
}
