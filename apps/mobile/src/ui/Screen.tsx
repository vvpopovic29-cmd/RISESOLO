import type { ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  const content = <View className="flex-1 gap-6 px-5 py-6">{children}</View>;

  return (
    <SafeAreaView className="flex-1 bg-neutral-1000 dark:bg-neutral-50" edges={["top", "bottom"]}>
      {scroll ? (
        <ScrollView contentContainerClassName="flex-grow" keyboardShouldPersistTaps="handled">
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}
