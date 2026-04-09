import { Pressable, Text, ActivityIndicator, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { ReactNode } from "react";

const APress = Animated.createAnimatedComponent(Pressable);

interface Props {
  onPress?: () => void;
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
}

export function Button({
  onPress,
  children,
  variant = "primary",
  loading,
  disabled,
  fullWidth = true,
}: Props) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const base =
    "rounded-card px-5 h-14 items-center justify-center flex-row " +
    (fullWidth ? "w-full " : "");
  const variants = {
    primary: "bg-accent",
    secondary: "bg-accentSoft",
    ghost: "bg-transparent border border-line",
  };
  const text = {
    primary: "text-white text-base font-medium",
    secondary: "text-accent text-base font-medium",
    ghost: "text-ink text-base font-medium",
  };
  const isOff = disabled || loading;

  return (
    <APress
      onPress={isOff ? undefined : onPress}
      onPressIn={() => (scale.value = withSpring(0.97, { duration: 120 }))}
      onPressOut={() => (scale.value = withSpring(1, { duration: 120 }))}
      style={style}
      className={`${base}${variants[variant]} ${isOff ? "opacity-50" : ""}`}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" ? "#fff" : "#E26A2C"} />
      ) : (
        <View className="flex-row items-center">
          {typeof children === "string" ? (
            <Text className={text[variant]}>{children}</Text>
          ) : (
            children
          )}
        </View>
      )}
    </APress>
  );
}
