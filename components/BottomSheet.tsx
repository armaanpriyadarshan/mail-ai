import { Modal, View, Pressable, KeyboardAvoidingView, Platform } from "react-native";
import Animated, { FadeIn, SlideInDown } from "react-native-reanimated";
import { ReactNode } from "react";

interface Props {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
}

// Lightweight bottom sheet — no third-party gesture library.
// Replace with @gorhom/bottom-sheet if we ever need real drag/snap behavior.
export function BottomSheet({ visible, onClose, children }: Props) {
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View
        entering={FadeIn.duration(180)}
        className="flex-1 bg-black/40 justify-end"
      >
        <Pressable className="flex-1" onPress={onClose} />
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <Animated.View
            entering={SlideInDown.duration(220).springify()}
            className="bg-paper rounded-t-3xl p-card pb-10"
          >
            <View className="items-center mb-4">
              <View className="w-12 h-1.5 rounded-full bg-line" />
            </View>
            {children}
          </Animated.View>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
}
