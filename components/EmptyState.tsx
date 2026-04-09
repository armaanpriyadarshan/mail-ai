import { View, Text } from "react-native";
import { ReactNode } from "react";

interface Props {
  title: string;
  body?: string;
  cta?: ReactNode;
  emoji?: string;
}

// Friendly, illustrated-feeling empty state without bringing in an SVG library yet.
// Swap the emoji for a real illustration once design picks one.
export function EmptyState({ title, body, cta, emoji = "✉️" }: Props) {
  return (
    <View className="items-center justify-center px-card py-16">
      <Text className="text-6xl mb-6">{emoji}</Text>
      <Text className="text-2xl text-ink font-serif text-center mb-3">{title}</Text>
      {body ? (
        <Text className="text-muted text-center text-base leading-6 mb-8 max-w-xs">{body}</Text>
      ) : null}
      {cta}
    </View>
  );
}
