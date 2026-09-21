import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { ApiError } from "@risesolo/api-client";
import { CUSTOM_ITEM_COIN_COST, CUSTOM_ITEM_DESCRIPTION_MAX_LENGTH, CUSTOM_ITEM_MAX_COUNT, CUSTOM_ITEM_NAME_MAX_LENGTH } from "@risesolo/domain";
import type { EventItemDto, InventoryItemDto, WorkshopItemDto } from "@risesolo/validation";
import { useAuth } from "../src/auth/AuthContext";
import { useAiItems } from "../src/inventory/use-ai-items";
import { useCustomItems } from "../src/inventory/use-custom-items";
import { useEventItems } from "../src/inventory/use-event-items";
import { useGuildItems } from "../src/inventory/use-guild-items";
import { useInventory } from "../src/inventory/use-inventory";
import { useRecoveryItems } from "../src/inventory/use-recovery-items";
import { useWorkshop } from "../src/inventory/use-workshop";
import { useI18n } from "../src/i18n";
import { usePlayerState } from "../src/player/use-player-state";
import { Button } from "../src/ui/Button";
import { ErrorState } from "../src/ui/ErrorState";
import { Screen } from "../src/ui/Screen";
import { TextField } from "../src/ui/TextField";

/**
 * Inventory - Hidden Items (tajni uslov, GET-only, vidi hidden-item.ts),
 * Workshop Items (unapred vidljiv katalog, izradjuje se preko POST
 * /inventory/workshop/craft uz nivo+coins, vidi workshop-item.ts) i Guild
 * Items (unapred vidljiv katalog, AUTOMATSKI dodeljen na osnovu cehovske
 * aktivnosti, GET-only kao Hidden, vidi guild-item.ts), Event Items
 * (unapred vidljiv katalog, prisvaja se BESPLATNO preko POST
 * /inventory/event/claim ali samo unutar godisnjeg kalendarskog prozora,
 * vidi event-item.ts), AI-Generated Items (tajan katalog kao Hidden, ali
 * name/description generise Claude po igracu, Pro-gated, vidi ai-item.ts) i
 * Recovery Items (unapred vidljiv katalog kao Guild, AUTOMATSKI dodeljen na
 * osnovu LICNOG obrasca odmora izmedju treninga, vidi recovery-item.ts) i
 * Custom Items (BEZ fiksnog kataloga - igrac SAM pise name/description
 * preko POST /inventory/custom/create, gate je cena u coins-ima i
 * ogranicen broj slotova, ne katalog uslov, vidi custom-item.ts) su svih
 * sedam izvora (B2). Ekran samo prikazuje ono sto server posalje, bez
 * lokalnog kataloga prikaznog teksta.
 */
export default function InventoryScreen() {
  const { apiClient } = useAuth();
  const { t } = useI18n();
  const { state, refetch } = useInventory(apiClient);
  const { state: workshopState, refetch: refetchWorkshop } = useWorkshop(apiClient);
  const { state: guildState, refetch: refetchGuild } = useGuildItems(apiClient);
  const { state: eventState, refetch: refetchEvent } = useEventItems(apiClient);
  const { state: aiState, refetch: refetchAi } = useAiItems(apiClient);
  const { state: recoveryState, refetch: refetchRecovery } = useRecoveryItems(apiClient);
  const { state: customState, refetch: refetchCustom } = useCustomItems(apiClient);
  const { state: playerState, refetch: refetchPlayer } = usePlayerState(apiClient);
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const [craftError, setCraftError] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [customName, setCustomName] = useState("");
  const [customDescription, setCustomDescription] = useState("");
  const [creatingCustom, setCreatingCustom] = useState(false);
  const [customError, setCustomError] = useState<string | null>(null);

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
      setCraftError(error instanceof ApiError ? error.message : t("inventory.craftFailed"));
    } finally {
      setBusyItemId(null);
    }
  }

  async function handleClaim(item: EventItemDto) {
    setBusyItemId(item.id);
    setClaimError(null);
    try {
      await apiClient.inventory.event.claim({ itemId: item.id });
      refetchEvent();
    } catch (error) {
      setClaimError(error instanceof ApiError ? error.message : t("inventory.claimFailed"));
    } finally {
      setBusyItemId(null);
    }
  }

  async function handleCreateCustomItem() {
    setCreatingCustom(true);
    setCustomError(null);
    try {
      await apiClient.inventory.custom.create({ name: customName, description: customDescription });
      setCustomName("");
      setCustomDescription("");
      refetchCustom();
      refetchPlayer();
    } catch (error) {
      setCustomError(error instanceof ApiError ? error.message : t("inventory.createCustomFailed"));
    } finally {
      setCreatingCustom(false);
    }
  }

  return (
    <Screen>
      <Pressable onPress={() => router.back()} testID="inventory-back">
        <Text className="text-accent">{t("common.back")}</Text>
      </Pressable>

      <Text className="text-2xl font-bold text-neutral-50 dark:text-neutral-1000">{t("inventory.title")}</Text>

      <Text className="text-sm font-semibold text-neutral-400 dark:text-neutral-700">{t("inventory.hiddenHeader")}</Text>
      <Text className="text-sm text-neutral-500 dark:text-neutral-600">{t("inventory.hiddenDescription")}</Text>

      {state.status === "loading" ? (
        <Text className="text-neutral-500 dark:text-neutral-600">{t("common.loading")}</Text>
      ) : state.status === "error" ? (
        <ErrorState message={state.message} onRetry={refetch} retryLabel={t("common.retry")} testID="inventory-error" />
      ) : (
        <>
          <Text testID="inventory-progress" className="text-sm text-neutral-500 dark:text-neutral-600">
            {t("inventory.progressLabel", { unlocked: state.data.filter((item) => item.discovered).length, total: state.data.length })}
          </Text>
          <View className="gap-3">
            {state.data.map((item) => (
              <InventoryItemCard key={item.id} item={item} />
            ))}
          </View>
        </>
      )}

      <Text className="mt-2 text-sm font-semibold text-neutral-400 dark:text-neutral-700">{t("inventory.workshopHeader")}</Text>
      <Text className="text-sm text-neutral-500 dark:text-neutral-600">{t("inventory.workshopDescription")}</Text>

      {craftError ? <Text className="text-center text-danger">{craftError}</Text> : null}

      {workshopState.status === "loading" ? (
        <Text className="text-neutral-500 dark:text-neutral-600">{t("common.loading")}</Text>
      ) : workshopState.status === "error" ? (
        <ErrorState message={workshopState.message} onRetry={refetchWorkshop} retryLabel={t("common.retry")} testID="workshop-error" />
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

      <Text className="mt-2 text-sm font-semibold text-neutral-400 dark:text-neutral-700">{t("inventory.guildHeader")}</Text>
      <Text className="text-sm text-neutral-500 dark:text-neutral-600">{t("inventory.guildDescription")}</Text>

      {guildState.status === "loading" ? (
        <Text className="text-neutral-500 dark:text-neutral-600">{t("common.loading")}</Text>
      ) : guildState.status === "error" ? (
        <ErrorState message={guildState.message} onRetry={refetchGuild} retryLabel={t("common.retry")} testID="guild-items-error" />
      ) : (
        <View className="gap-3">
          {guildState.data.map((item) => (
            <InventoryItemCard key={item.id} item={item} revealAlways />
          ))}
        </View>
      )}

      <Text className="mt-2 text-sm font-semibold text-neutral-400 dark:text-neutral-700">{t("inventory.eventHeader")}</Text>
      <Text className="text-sm text-neutral-500 dark:text-neutral-600">{t("inventory.eventDescription")}</Text>

      {claimError ? <Text className="text-center text-danger">{claimError}</Text> : null}

      {eventState.status === "loading" ? (
        <Text className="text-neutral-500 dark:text-neutral-600">{t("common.loading")}</Text>
      ) : eventState.status === "error" ? (
        <ErrorState message={eventState.message} onRetry={refetchEvent} retryLabel={t("common.retry")} testID="event-items-error" />
      ) : (
        <View className="gap-3">
          {eventState.data.map((item) => (
            <EventItemCard
              key={item.id}
              item={item}
              busy={busyItemId === item.id}
              onClaim={() => void handleClaim(item)}
            />
          ))}
        </View>
      )}

      <Text className="mt-2 text-sm font-semibold text-neutral-400 dark:text-neutral-700">{t("inventory.aiHeader")}</Text>
      <Text className="text-sm text-neutral-500 dark:text-neutral-600">{t("inventory.aiDescription")}</Text>

      {aiState.status === "loading" ? (
        <Text className="text-neutral-500 dark:text-neutral-600">{t("common.loading")}</Text>
      ) : aiState.status === "error" ? (
        <ErrorState message={aiState.message} onRetry={refetchAi} retryLabel={t("common.retry")} testID="ai-items-error" />
      ) : (
        <View className="gap-3">
          {aiState.data.map((item) => (
            <InventoryItemCard key={item.id} item={item} />
          ))}
        </View>
      )}

      <Text className="mt-2 text-sm font-semibold text-neutral-400 dark:text-neutral-700">{t("inventory.recoveryHeader")}</Text>
      <Text className="text-sm text-neutral-500 dark:text-neutral-600">{t("inventory.recoveryDescription")}</Text>

      {recoveryState.status === "loading" ? (
        <Text className="text-neutral-500 dark:text-neutral-600">{t("common.loading")}</Text>
      ) : recoveryState.status === "error" ? (
        <ErrorState message={recoveryState.message} onRetry={refetchRecovery} retryLabel={t("common.retry")} testID="recovery-items-error" />
      ) : (
        <View className="gap-3">
          {recoveryState.data.map((item) => (
            <InventoryItemCard key={item.id} item={item} revealAlways />
          ))}
        </View>
      )}

      <Text className="mt-2 text-sm font-semibold text-neutral-400 dark:text-neutral-700">{t("inventory.customHeader")}</Text>
      <Text className="text-sm text-neutral-500 dark:text-neutral-600">
        {t("inventory.customDescription", { cost: CUSTOM_ITEM_COIN_COST, max: CUSTOM_ITEM_MAX_COUNT })}
      </Text>

      {customError ? <Text className="text-center text-danger">{customError}</Text> : null}

      {customState.status === "success" && customState.data.length < CUSTOM_ITEM_MAX_COUNT ? (
        <View className="gap-2">
          <TextField
            label={t("inventory.customNameLabel")}
            placeholder={t("inventory.customNamePlaceholder")}
            value={customName}
            onChangeText={setCustomName}
            maxLength={CUSTOM_ITEM_NAME_MAX_LENGTH}
            testID="custom-item-name-input"
          />
          <TextField
            label={t("inventory.customDescriptionLabel")}
            placeholder={t("inventory.customDescriptionPlaceholder")}
            value={customDescription}
            onChangeText={setCustomDescription}
            maxLength={CUSTOM_ITEM_DESCRIPTION_MAX_LENGTH}
            testID="custom-item-description-input"
          />
          <Button
            label={t("inventory.createCustom")}
            onPress={() => void handleCreateCustomItem()}
            loading={creatingCustom}
            disabled={customName.trim().length === 0 || customDescription.trim().length === 0}
            testID="create-custom-item-button"
          />
        </View>
      ) : null}

      {customState.status === "loading" ? (
        <Text className="text-neutral-500 dark:text-neutral-600">{t("common.loading")}</Text>
      ) : customState.status === "error" ? (
        <ErrorState message={customState.message} onRetry={refetchCustom} retryLabel={t("common.retry")} testID="custom-items-error" />
      ) : customState.data.length === 0 ? (
        <Text testID="custom-items-empty" className="text-neutral-500 dark:text-neutral-600">
          {t("inventory.customEmpty")}
        </Text>
      ) : (
        <View className="gap-3">
          {customState.data.map((item) => (
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
  const { t, locale } = useI18n();
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
        <Text className="font-semibold text-neutral-50 dark:text-neutral-1000">{reveal ? item.name : t("inventory.unknownName")}</Text>
        <Text className="text-xs text-neutral-500 dark:text-neutral-600">
          {reveal ? item.description : t("inventory.unknownCondition")}
        </Text>
        {item.discovered && item.discoveredAt ? (
          <Text className="text-xs text-premium">
            {t("inventory.discoveredOn", { date: new Date(item.discoveredAt).toLocaleDateString(locale === "en" ? "en-US" : "sr-Latn-RS") })}
          </Text>
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
  const { t } = useI18n();
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
          <Text className="text-xs text-reward">{t("inventory.levelCost", { level: item.levelRequirement, cost: item.coinCost })}</Text>
        ) : null}
      </View>

      {item.owned ? (
        <Text className="text-xs text-premium">{t("inventory.crafted")}</Text>
      ) : (
        <Button
          label={t("inventory.craft")}
          onPress={onCraft}
          loading={busy}
          disabled={!meetsLevel || !canAfford}
          testID={`craft-${item.id}`}
        />
      )}
    </View>
  );
}

function EventItemCard({
  item,
  busy,
  onClaim,
}: {
  item: EventItemDto;
  busy: boolean;
  onClaim: () => void;
}) {
  const { t } = useI18n();
  return (
    <View
      testID={`event-item-${item.id}`}
      className={`flex-row items-center justify-between gap-3 rounded-lg border p-3 ${
        item.owned ? "border-premium bg-premium/10" : "border-neutral-700 dark:border-neutral-400"
      }`}
    >
      <View className="flex-1 gap-0.5">
        <Text className="font-semibold text-neutral-50 dark:text-neutral-1000">{item.name}</Text>
        <Text className="text-xs text-neutral-500 dark:text-neutral-600">{item.description}</Text>
        {!item.owned ? (
          <Text className={`text-xs ${item.active ? "text-reward" : "text-neutral-500 dark:text-neutral-600"}`}>
            {item.active ? t("inventory.availableNow") : t("inventory.outOfSeason")}
          </Text>
        ) : null}
      </View>

      {item.owned ? (
        <Text className="text-xs text-premium">{t("inventory.claimed")}</Text>
      ) : (
        <Button
          label={t("inventory.claim")}
          onPress={onClaim}
          loading={busy}
          disabled={!item.active}
          testID={`claim-${item.id}`}
        />
      )}
    </View>
  );
}
