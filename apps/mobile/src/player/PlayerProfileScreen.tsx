import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import type { PlayerClass, PlayerStatName } from "@risesolo/validation";
import { classLabels } from "./class-labels";
import { usePlayer } from "./use-player";
import { useUpdatePlayer } from "./use-update-player";
import { useAllocateStatPoints } from "./use-allocate-stat-points";

const statLabels: Record<PlayerStatName, string> = {
  strength: "Strength",
  agility: "Agility",
  endurance: "Endurance",
  vitality: "Vitality",
  intelligence: "Intelligence",
};

/**
 * Zatvara postojecu prazninu: `PATCH /players/me` i
 * `POST /players/me/stat-points/allocate` postoje na backendu (i u
 * api-client-u) od Faze 2, ali do sada nijedan mobilni ekran nije zvao ni
 * jedno ni drugo - Class se mogao izabrati samo direktnim API pozivom, a
 * Stat Points su se samo prikazivali kao broj bez nacina da se potrose.
 */
export function PlayerProfileScreen() {
  const { state: playerState, refetch: refetchPlayer } = usePlayer();
  const { state: updateState, submit: submitUpdate, reset: resetUpdateState } = useUpdatePlayer();
  const {
    state: allocateState,
    submit: submitAllocate,
    reset: resetAllocateState,
  } = useAllocateStatPoints();

  const [displayName, setDisplayName] = useState("");
  const [selectedClass, setSelectedClass] = useState<PlayerClass | null>(null);

  useEffect(() => {
    if (playerState.status === "success") {
      setDisplayName(playerState.data.displayName);
      setSelectedClass(playerState.data.class);
    }
  }, [playerState]);

  useEffect(() => {
    if (updateState.status === "success") {
      resetUpdateState();
      refetchPlayer();
    }
  }, [updateState, resetUpdateState, refetchPlayer]);

  useEffect(() => {
    if (allocateState.status === "success") {
      resetAllocateState();
      refetchPlayer();
    }
  }, [allocateState, resetAllocateState, refetchPlayer]);

  function handleSaveProfile() {
    const trimmed = displayName.trim();
    if (trimmed.length === 0) {
      return;
    }
    submitUpdate(
      selectedClass ? { displayName: trimmed, class: selectedClass } : { displayName: trimmed },
    );
  }

  function handleAllocate(stat: PlayerStatName) {
    submitAllocate({ stat, points: 1 });
  }

  if (playerState.status === "loading") {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-1000 dark:bg-neutral-50">
        <Text className="text-neutral-600">Ucitavanje profila...</Text>
      </View>
    );
  }

  if (playerState.status === "error") {
    return (
      <View className="flex-1 items-center justify-center gap-2 bg-neutral-1000 px-6 dark:bg-neutral-50">
        <Text testID="player-profile-error" className="text-danger">
          Ne mogu da ucitam profil: {playerState.message}
        </Text>
        <Pressable
          onPress={refetchPlayer}
          className="rounded-md border border-neutral-500 px-3 py-1.5"
        >
          <Text className="text-neutral-50 dark:text-neutral-1000">Pokusaj ponovo</Text>
        </Pressable>
      </View>
    );
  }

  const player = playerState.data;

  return (
    <ScrollView className="flex-1 bg-neutral-1000 dark:bg-neutral-50">
      <View className="gap-6 px-6 py-12">
        <Text className="text-2xl font-bold text-neutral-50 dark:text-neutral-1000">Profil</Text>

        <View className="gap-2">
          <Text className="text-xs uppercase tracking-wide text-accent">Ime</Text>
          <TextInput
            testID="player-profile-display-name-input"
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Ime igraca"
            className="rounded-md border border-neutral-500 px-3 py-2 text-neutral-50 dark:text-neutral-1000"
            placeholderTextColor="#8a8a8a"
          />
        </View>

        <View className="gap-2">
          <Text className="text-xs uppercase tracking-wide text-accent">Class</Text>
          <View className="flex-row flex-wrap gap-2">
            {(Object.keys(classLabels) as PlayerClass[]).map((playerClass) => (
              <Pressable
                key={playerClass}
                testID={`player-profile-class-${playerClass}`}
                onPress={() => setSelectedClass(playerClass)}
                className={`rounded-md border px-3 py-2 ${
                  selectedClass === playerClass ? "border-accent bg-accent" : "border-neutral-500"
                }`}
              >
                <Text
                  className={
                    selectedClass === playerClass
                      ? "font-semibold text-neutral-50"
                      : "text-neutral-50 dark:text-neutral-1000"
                  }
                >
                  {classLabels[playerClass]}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {updateState.status === "error" ? (
          <Text testID="player-profile-save-error" className="text-danger">
            Ne mogu da sacuvam profil: {updateState.message}
          </Text>
        ) : null}

        <Pressable
          testID="player-profile-save"
          onPress={handleSaveProfile}
          disabled={updateState.status === "submitting"}
          className={`items-center rounded-md bg-accent px-4 py-3 ${
            updateState.status === "submitting" ? "opacity-50" : ""
          }`}
        >
          <Text className="font-semibold text-neutral-50">
            {updateState.status === "submitting" ? "Cuvanje..." : "Sacuvaj profil"}
          </Text>
        </Pressable>

        <View className="gap-2">
          <View className="flex-row items-baseline justify-between">
            <Text className="text-xs uppercase tracking-wide text-accent">Stat Points</Text>
            <Text className="text-reward">{player.statPointsAvailable} dostupno</Text>
          </View>

          {allocateState.status === "error" ? (
            <Text testID="player-profile-allocate-error" className="text-danger">
              Ne mogu da dodelim stat poen: {allocateState.message}
            </Text>
          ) : null}

          <View className="gap-2">
            {(Object.keys(statLabels) as PlayerStatName[]).map((stat) => (
              <View
                key={stat}
                className="flex-row items-center justify-between rounded-md border border-neutral-400 px-3 py-2"
              >
                <Text className="text-neutral-50 dark:text-neutral-1000">
                  {statLabels[stat]}: {player[stat]}
                </Text>
                <Pressable
                  testID={`player-profile-allocate-${stat}`}
                  onPress={() => handleAllocate(stat)}
                  disabled={
                    player.statPointsAvailable <= 0 || allocateState.status === "submitting"
                  }
                  className={`rounded-md border border-accent px-3 py-1 ${
                    player.statPointsAvailable <= 0 || allocateState.status === "submitting"
                      ? "opacity-50"
                      : ""
                  }`}
                >
                  <Text className="font-semibold text-accent">+1</Text>
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
