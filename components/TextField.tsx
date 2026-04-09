import { TextInput, View, Text, TextInputProps } from "react-native";
import { colors } from "@/lib/theme";

interface Props extends TextInputProps {
  label?: string;
  helper?: string;
  large?: boolean;
}

export function TextField({ label, helper, large, style, ...rest }: Props) {
  return (
    <View className="w-full">
      {label ? <Text className="text-muted text-sm mb-2">{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.muted}
        className={`bg-card border border-line rounded-card px-4 ${
          large ? "py-5 text-xl" : "py-4 text-base"
        } text-ink`}
        style={style}
        {...rest}
      />
      {helper ? <Text className="text-muted text-xs mt-2">{helper}</Text> : null}
    </View>
  );
}
