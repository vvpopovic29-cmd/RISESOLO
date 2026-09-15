import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import type { AllocateStatPointsRequest, PlayerStatsDto } from "@risesolo/validation";
import { Button } from "../ui/Button";

const STAT_LABELS: ReadonlyArray<{ key: keyof AllocateStatPointsRequest; label: string }> = [
  { key: "strength", label: "Snaga" },
  { key: "agility", label: "Agilnost" },
  { key: "endurance", label: "Izdrzljivost" },
  { key: "vitality", label: "Vitalnost" },
  { key: "intelligence", label: "Inteligencija" },
];

/**
 * LEVEL UP -> STAT POINTS -> igrac rucno raspodeljuje poene (nikad
 * automatski). Lokalno stanje je samo "predlog raspodele" dok se ne potvrdi -
 * server (`allocateStatPoints` iz @risesolo/domain) je i dalje jedini
 * autoritet koji upisuje konacnu vrednost.
 */
export function StatAllocator({
  stats,
  onSubmit,
  submitting,
}: {
  stats: PlayerStatsDto;
  onSubmit: (allocation: AllocateStatPointsRequest) => void;
  submitting: boolean;
}) {
  const [pending, setPending] = useState<Record<string, number>>({});
  const totalPending = Object.values(pending).reduce((sum, value) => sum + value, 0);
  const remaining = stats.statPoints - totalPending;

  function adjust(key: string, delta: number) {
    setPending((current) => {
      const next = Math.max(0, (current[key] ?? 0) + delta);
      if (delta > 0 && remaining <= 0) return current;
      return { ...current, [key]: next };
    });
  }

  return (
    <View className="gap-3 rounded-lg border border-reward bg-reward/10 p-4">
      <Text className="font-semibold text-reward">+{stats.statPoints} poena za raspodelu (preostalo: {remaining})</Text>
      {STAT_LABELS.map(({ key, label }) => (
        <View key={key} className="flex-row items-center justify-between">
          <Text className="text-neutral-50 dark:text-neutral-1000">{label}</Text>
          <View className="flex-row items-center gap-3">
            <Pressable
              onPress={() => adjust(key, -1)}
              className="h-7 w-7 items-center justify-center rounded-full border border-neutral-700 dark:border-neutral-400"
            >
              <Text className="text-neutral-50 dark:text-neutral-1000">-</Text>
            </Pressable>
            <Text className="w-10 text-center text-neutral-50 dark:text-neutral-1000">
              {stats[key as keyof PlayerStatsDto]}
              {pending[key] ? ` +${pending[key]}` : ""}
            </Text>
            <Pressable
              onPress={() => adjust(key, 1)}
              className="h-7 w-7 items-center justify-center rounded-full border border-neutral-700 dark:border-neutral-400"
            >
              <Text className="text-neutral-50 dark:text-neutral-1000">+</Text>
            </Pressable>
          </View>
        </View>
      ))}
      <Button
        label="Potvrdi raspodelu"
        onPress={() => onSubmit(pending)}
        disabled={totalPending === 0}
        loading={submitting}
        testID="stat-allocator-submit"
      />
    </View>
  );
}
