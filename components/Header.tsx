import { View, Text, Pressable } from "react-native";
import { ReactNode } from "react";

interface Props {
  title: string;
  back?: () => void;
  right?: ReactNode;
}

// Sentence case only — never uppercase. Generous breathing room.
export function Header({ title, back, right }: Props) {
  return (
    <View className="px-card pt-card pb-3 flex-row items-center justify-between">
      <View className="flex-row items-center flex-1">
        {back ? (
          <Pressable onPress={back} className="mr-3 p-1">
            <Text className="text-2xl text-ink">←</Text>
          </Pressable>
        ) : null}
        <Text className="text-2xl text-ink font-serif">{title}</Text>
      </View>
      {right}
    </View>
  );
}
