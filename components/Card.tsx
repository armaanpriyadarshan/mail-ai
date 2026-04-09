import { View, Pressable, ViewProps } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { ReactNode } from "react";

interface Props extends ViewProps {
  children: ReactNode;
  onPress?: () => void;
  delay?: number;
}

export function Card({ children, onPress, delay = 0, className = "", ...rest }: Props) {
  const inner = (
    <Animated.View
      entering={FadeInDown.delay(delay).duration(280).springify()}
      className={`bg-card rounded-card p-card border border-line ${className}`}
      {...rest}
    >
      {children}
    </Animated.View>
  );
  if (onPress) {
    return (
      <Pressable onPress={onPress} className="active:opacity-80">
        {inner}
      </Pressable>
    );
  }
  return inner;
}
