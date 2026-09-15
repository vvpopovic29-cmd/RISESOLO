import type { ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  // Na tablet/desktop sirinama (md+) sadrzaj se ogranicava i centrira umesto
  // da se razvlaci preko celog ekrana - mobilni layout (< md) ostaje nepromenjen.
  const content = (
    <View className="w-full max-w-2xl flex-1 self-center gap-6 px-5 py-6 md:px-8 md:py-10">{children}</View>
  );

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
