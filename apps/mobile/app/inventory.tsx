import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { ApiError } from "@risesolo/api-client";
import type { InventoryItemDto, WorkshopItemDto } from "@risesolo/validation";
import { useAuth } from "../src/auth/AuthContext";
import { useGuildItems } from "../src/inventory/use-guild-items";
import { useInventory } from "../src/inventory/use-inventory";
import { useWorkshop } from "../src/inventory/use-workshop";
import { usePlayerState } from "../src/player/use-player-state";
import { Button } from "../src/ui/Button";
import { ErrorState } from "../src/ui/ErrorState";
import { Screen } from "../src/ui/Screen";

/**
 * Inventory - Hidden Items (tajni uslov, GET-only, vidi hidden-item.ts),
 * Workshop Items (unapred vidljiv katalog, izradjuje se preko POST
 * /inventory/workshop/craft uz nivo+coins, vidi workshop-item.ts) i Guild
 * Items (unapred vidljiv katalog, AUTOMATSKI dodeljen na osnovu cehovske
 * aktivnosti, GET-only kao Hidden, vidi guild-item.ts) su prva tri izvora
 * (B2). Ekran samo prikazuje ono sto server posalje, bez lokalnog kataloga
 * prikaznog teksta.
 */
export default function InventoryScreen() {
  const { apiClient } = useAuth();
  const { state, refetch } = useInventory(apiClient);
  const { state: workshopState, refetch: refetchWorkshop } = useWorkshop(apiClient);
  const { state: guildState, refetch: refetchGuild } = useGuildItems(apiClient);
  const { state: playerState, refetch: refetchPlayer } = usePlayerState(apiClient);
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const [craftError, setCraftError] = useState<string | null>(null);

  const level = playerState.status === "success" ? playerState.data.progression.level : null;
  const coins = playerState.status === "success" ? playerState.data.progression.coins : null;

  async function handleCraft(item: WorkshopItemDto) {
    setBusyItemId(item.id);
    setCraftError(null);
    try {
      await apiClient.inventory.workshop.craft({ itemId: item.id });
      refetchWorkshop();
      refetchPlayer();
    } catch (error) {
      setCraftError(error instanceof ApiError ? error.message : "Izrada nije uspela.");
    } finally {
      setBusyItemId(null);
    }
  }

  return (
    <Screen>
      <Pressable onPress={() => router.back()} testID="inventory-back">
        <Text className="text-accent">{"< Nazad"}</Text>
      </Pressable>

      <Text className="text-2xl font-bold text-neutral-50 dark:text-neutral-1000">Inventory</Text>

      <Text className="text-sm font-semibold text-neutral-400 dark:text-neutral-700">HIDDEN ITEMS</Text>
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

      <Text className="mt-2 text-sm font-semibold text-neutral-400 dark:text-neutral-700">WORKSHOP</Text>
      <Text className="text-sm text-neutral-500 dark:text-neutral-600">
        Predmeti koje mozes da izradis kada dostignes potreban nivo i imas dovoljno coins-a.
      </Text>

      {craftError ? <Text className="text-center text-danger">{craftError}</Text> : null}

      {workshopState.status === "loading" ? (
        <Text className="text-neutral-500 dark:text-neutral-600">Ucitavam...</Text>
      ) : workshopState.status === "error" ? (
        <ErrorState message={workshopState.message} onRetry={refetchWorkshop} testID="workshop-error" />
      ) : (
        <View className="gap-3">
          {workshopState.data.map((item) => (
            <WorkshopItemCard
              key={item.id}
              item={item}
              level={level}
              coins={coins}
              busy={busyItemId === item.id}
              onCraft={() => void handleCraft(item)}
            />
          ))}
        </View>
      )}

      <Text className="mt-2 text-sm font-semibold text-neutral-400 dark:text-neutral-700">GUILD</Text>
      <Text className="text-sm text-neutral-500 dark:text-neutral-600">
        Cehovski trofeji - dodeljuju se automatski dok si clan ceha, uslovi su unapred poznati.
      </Text>

      {guildState.status === "loading" ? (
        <Text className="text-neutral-500 dark:text-neutral-600">Ucitavam...</Text>
      ) : guildState.status === "error" ? (
        <ErrorState message={guildState.message} onRetry={refetchGuild} testID="guild-items-error" />
      ) : (
        <View className="gap-3">
          {guildState.data.map((item) => (
            <InventoryItemCard key={item.id} item={item} revealAlways />
          ))}
        </View>
      )}
    </Screen>
  );
}

/**
 * `revealAlways` - koriste ga izvori ciji je katalog unapred vidljiv (Guild)
 * da uvek prikazu name/description, za razliku od Hidden Item-a koji "???"
 * dok se ne otkrije (uslov otkljucavanja je tajna, ne samo prikaz).
 */
function InventoryItemCard({ item, revealAlways = false }: { item: InventoryItemDto; revealAlways?: boolean }) {
  const reveal = item.discovered || revealAlways;
  return (
    <View
      testID={`inventory-item-${item.id}`}
      className={`flex-row items-center gap-3 rounded-lg border p-4 ${
        item.discovered ? "border-premium bg-premium/10" : "border-neutral-700 opacity-50 dark:border-neutral-400"
      }`}
    >
      <Text className="text-2xl">{item.discovered ? "✨" : "🔒"}</Text>
      <View className="flex-1 gap-0.5">
        <Text className="font-semibold text-neutral-50 dark:text-neutral-1000">{reveal ? item.name : "???"}</Text>
        <Text className="text-xs text-neutral-500 dark:text-neutral-600">
          {reveal ? item.description : "Uslov otkljucavanja je tajna."}
        </Text>
        {item.discovered && item.discoveredAt ? (
          <Text className="text-xs text-premium">Otkriveno {new Date(item.discoveredAt).toLocaleDateString("sr-Latn-RS")}</Text>
        ) : null}
      </View>
    </View>
  );
}

function WorkshopItemCard({
  item,
  level,
  coins,
  busy,
  onCraft,
}: {
  item: WorkshopItemDto;
  level: number | null;
  coins: number | null;
  busy: boolean;
  onCraft: () => void;
}) {
  const meetsLevel = level !== null && level >= item.levelRequirement;
  const canAfford = coins !== null && coins >= item.coinCost;

  return (
    <View
      testID={`workshop-item-${item.id}`}
      className={`flex-row items-center justify-between gap-3 rounded-lg border p-3 ${
        item.owned ? "border-premium bg-premium/10" : "border-neutral-700 dark:border-neutral-400"
      }`}
    >
      <View className="flex-1 gap-0.5">
        <Text className="font-semibold text-neutral-50 dark:text-neutral-1000">{item.name}</Text>
        <Text className="text-xs text-neutral-500 dark:text-neutral-600">{item.description}</Text>
        {!item.owned ? (
          <Text className="text-xs text-reward">
            Nivo {item.levelRequirement} - {item.coinCost} coins
          </Text>
        ) : null}
      </View>

      {item.owned ? (
        <Text className="text-xs text-premium">Izradjeno</Text>
      ) : (
        <Button
          label="Izradi"
          onPress={onCraft}
          loading={busy}
          disabled={!meetsLevel || !canAfford}
          testID={`craft-${item.id}`}
        />
      )}
    </View>
  );
}
