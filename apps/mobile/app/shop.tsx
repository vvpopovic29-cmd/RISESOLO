import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { ApiError } from "@risesolo/api-client";
import type { ShopItemDto } from "@risesolo/validation";
import { useAuth } from "../src/auth/AuthContext";
import { useI18n } from "../src/i18n";
import { usePlayerState } from "../src/player/use-player-state";
import { useShop } from "../src/shop/use-shop";
import { ErrorState } from "../src/ui/ErrorState";
import { Button } from "../src/ui/Button";
import { Screen } from "../src/ui/Screen";

type ShopCategory = ShopItemDto["category"];

export default function ShopScreen() {
  const { apiClient } = useAuth();
  const { t } = useI18n();
  const { state, refetch } = useShop(apiClient);
  const { state: playerState, refetch: refetchPlayer } = usePlayerState(apiClient);
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const CATEGORY_LABEL: Record<ShopCategory, string> = {
    AVATAR_FRAME: t("shop.categoryFrames"),
    TITLE: t("shop.categoryTitles"),
  };

  const coins = playerState.status === "success" ? playerState.data.progression.coins : null;

  async function handlePurchase(item: ShopItemDto) {
    setBusyItemId(item.id);
    setActionError(null);
    try {
      await apiClient.shop.purchase({ itemId: item.id });
      refetch();
      refetchPlayer();
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : t("shop.purchaseFailed"));
    } finally {
      setBusyItemId(null);
    }
  }

  async function handleEquip(item: ShopItemDto) {
    setBusyItemId(item.id);
    setActionError(null);
    try {
      await apiClient.shop.equip({ itemId: item.id });
      refetch();
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : t("shop.equipFailed"));
    } finally {
      setBusyItemId(null);
    }
  }

  async function handleUnequip(item: ShopItemDto) {
    setBusyItemId(item.id);
    setActionError(null);
    try {
      await apiClient.shop.unequip(item.category);
      refetch();
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : t("shop.unequipFailed"));
    } finally {
      setBusyItemId(null);
    }
  }

  return (
    <Screen>
      <Pressable onPress={() => router.back()} testID="shop-back">
        <Text className="text-accent">{t("common.back")}</Text>
      </Pressable>

      <View className="flex-row items-center justify-between">
        <Text className="text-2xl font-bold text-neutral-50 dark:text-neutral-1000">{t("shop.title")}</Text>
        {coins !== null ? (
          <Text testID="shop-coins" className="text-sm font-semibold text-reward">
            {coins} coins
          </Text>
        ) : null}
      </View>

      {actionError ? <Text className="text-center text-danger">{actionError}</Text> : null}

      {state.status === "loading" ? (
        <Text className="text-neutral-500 dark:text-neutral-600">{t("common.loading")}</Text>
      ) : state.status === "error" ? (
        <ErrorState message={state.message} onRetry={refetch} retryLabel={t("common.retry")} testID="shop-error" />
      ) : (
        (["AVATAR_FRAME", "TITLE"] as const).map((category) => {
          const items = state.data.filter((item) => item.category === category);
          return (
            <View key={category} className="gap-2">
              <Text className="text-sm font-semibold text-neutral-400 dark:text-neutral-700">
                {CATEGORY_LABEL[category].toUpperCase()}
              </Text>
              {items.map((item) => (
                <ShopItemRow
                  key={item.id}
                  item={item}
                  coins={coins}
                  busy={busyItemId === item.id}
                  onPurchase={() => void handlePurchase(item)}
                  onEquip={() => void handleEquip(item)}
                  onUnequip={() => void handleUnequip(item)}
                  labels={{ equip: t("shop.equip"), unequip: t("shop.unequip"), purchase: t("shop.purchase") }}
                />
              ))}
            </View>
          );
        })
      )}
    </Screen>
  );
}

function ShopItemRow({
  item,
  coins,
  busy,
  onPurchase,
  onEquip,
  onUnequip,
  labels,
}: {
  item: ShopItemDto;
  coins: number | null;
  busy: boolean;
  onPurchase: () => void;
  onEquip: () => void;
  onUnequip: () => void;
  labels: { equip: string; unequip: string; purchase: string };
}) {
  const canAfford = coins !== null && coins >= item.price;

  return (
    <View
      testID={`shop-item-${item.id}`}
      className={`flex-row items-center justify-between gap-3 rounded-lg border p-3 ${
        item.equipped ? "border-accent bg-accent/10" : "border-neutral-700 dark:border-neutral-400"
      }`}
    >
      <View className="flex-1 flex-row items-center gap-2">
        {item.colorHex ? (
          <View style={{ backgroundColor: item.colorHex }} className="h-6 w-6 rounded-full" />
        ) : null}
        <View className="flex-1">
          <Text className="font-semibold text-neutral-50 dark:text-neutral-1000">{item.name}</Text>
          <Text className="text-xs text-neutral-500 dark:text-neutral-600">{item.description}</Text>
          {!item.owned ? <Text className="text-xs text-reward">{item.price} coins</Text> : null}
        </View>
      </View>

      {item.equipped ? (
        <Button label={labels.unequip} variant="secondary" onPress={onUnequip} loading={busy} testID={`unequip-${item.id}`} />
      ) : item.owned ? (
        <Button label={labels.equip} onPress={onEquip} loading={busy} testID={`equip-${item.id}`} />
      ) : (
        <Button
          label={labels.purchase}
          onPress={onPurchase}
          loading={busy}
          disabled={!canAfford}
          testID={`purchase-${item.id}`}
        />
      )}
    </View>
  );
}
