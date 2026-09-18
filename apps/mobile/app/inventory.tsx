import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import type { InventoryItemDto } from "@risesolo/validation";
import { useAuth } from "../src/auth/AuthContext";
import { useInventory } from "../src/inventory/use-inventory";
import { ErrorState } from "../src/ui/ErrorState";
import { Screen } from "../src/ui/Screen";

/**
 * Inventory - Hidden Items su prvi izvor (B2). Za razliku od Achievements
 * ekrana, klijent NIKAD ne zna name/description neotkrivenog predmeta - to
 * je namerno tajna na serveru (vidi @risesolo/domain hidden-item.ts), pa
 * ovaj ekran nema lokalni katalog prikaznog teksta poput
 * achievement-display.ts, samo prikazuje ono sto server posalje.
 */
export default function InventoryScreen() {
  const { apiClient } = useAuth();
  const { state, refetch } = useInventory(apiClient);

  return (
    <Screen>
      <Pressable onPress={() => router.back()} testID="inventory-back">
        <Text className="text-accent">{"< Nazad"}</Text>
      </Pressable>

      <Text className="text-2xl font-bold text-neutral-50 dark:text-neutral-1000">Inventory</Text>
      <Text className="text-sm text-neutral-500 dark:text-neutral-600">
        Tajni predmeti koje otkrivas kroz igru - uslov otkljucavanja ostaje skriven dok ga ne ispunis.
      </Text>

      {state.status === "loading" ? (
        <Text className="text-neutral-500 dark:text-neutral-600">Ucitavam...</Text>
      ) : state.status === "error" ? (
        <ErrorState message={state.message} onRetry={refetch} testID="inventory-error" />
      ) : (
        <>
          <Text testID="inventory-progress" className="text-sm text-neutral-500 dark:text-neutral-600">
            {state.data.filter((item) => item.discovered).length} / {state.data.length} otkriveno
          </Text>
          <View className="gap-3">
            {state.data.map((item) => (
              <InventoryItemCard key={item.id} item={item} />
            ))}
          </View>
        </>
      )}
    </Screen>
  );
}

function InventoryItemCard({ item }: { item: InventoryItemDto }) {
  return (
    <View
      testID={`inventory-item-${item.id}`}
      className={`flex-row items-center gap-3 rounded-lg border p-4 ${
        item.discovered ? "border-premium bg-premium/10" : "border-neutral-700 opacity-50 dark:border-neutral-400"
      }`}
    >
      <Text className="text-2xl">{item.discovered ? "✨" : "🔒"}</Text>
      <View className="flex-1 gap-0.5">
        <Text className="font-semibold text-neutral-50 dark:text-neutral-1000">{item.discovered ? item.name : "???"}</Text>
        <Text className="text-xs text-neutral-500 dark:text-neutral-600">
          {item.discovered ? item.description : "Uslov otkljucavanja je tajna."}
        </Text>
        {item.discovered && item.discoveredAt ? (
          <Text className="text-xs text-premium">Otkriveno {new Date(item.discoveredAt).toLocaleDateString("sr-Latn-RS")}</Text>
        ) : null}
      </View>
    </View>
  );
}
