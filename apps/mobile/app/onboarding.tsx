import { useState } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { onboardProfileRequestSchema, type OnboardProfileRequest } from "@risesolo/validation";
import { ApiError } from "@risesolo/api-client";
import { useAuth } from "../src/auth/AuthContext";
import { Button } from "../src/ui/Button";
import { ChoiceGroup } from "../src/ui/ChoiceGroup";
import { Screen } from "../src/ui/Screen";
import { TextField } from "../src/ui/TextField";

const TRAINING_TYPE_OPTIONS = [
  { value: "CALISTHENICS", label: "Calisthenics" },
  { value: "GYM", label: "Teretana" },
  { value: "BOTH", label: "Oboje" },
] as const;

const EXPERIENCE_OPTIONS = [
  { value: "BEGINNER", label: "Pocetnik" },
  { value: "INTERMEDIATE", label: "Srednji" },
  { value: "ADVANCED", label: "Napredni" },
] as const;

/** Prazan string -> undefined, inace parsira broj (koristi se za opciona numericka polja onboarding forme). */
function parseOptionalNumber(text: string): number | undefined {
  const trimmed = text.trim();
  if (trimmed === "") return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export default function OnboardingScreen() {
  const { state, apiClient } = useAuth();
  const currentUsername = state.status === "signedIn" ? state.user.username : "";

  const [username, setUsername] = useState(currentUsername);
  const [age, setAge] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [trainingType, setTrainingType] = useState<OnboardProfileRequest["trainingType"]>();
  const [experienceLevel, setExperienceLevel] = useState<OnboardProfileRequest["experienceLevel"]>();
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit() {
    const dto = {
      username: username.trim(),
      age: parseOptionalNumber(age),
      heightCm: parseOptionalNumber(heightCm),
      weightKg: parseOptionalNumber(weightKg),
      trainingType,
      experienceLevel,
    };
    const parsed = onboardProfileRequestSchema.safeParse(dto);
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? "Proveri unete podatke.");
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      await apiClient.players.onboard(parsed.data);
      router.replace("/");
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : "Cuvanje profila nije uspelo.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen>
      <View className="gap-1">
        <Text className="text-2xl font-bold text-neutral-50 dark:text-neutral-1000">Predstavi svog lika</Text>
        <Text className="text-neutral-500 dark:text-neutral-600">
          Ovo pomaze da RISESOLO prilagodi tvoj System. Sve osim korisnickog imena je opciono.
        </Text>
      </View>

      <View className="gap-4">
        <TextField label="Korisnicko ime" value={username} onChangeText={setUsername} autoCapitalize="none" />
        <TextField label="Godine (opciono)" value={age} onChangeText={setAge} keyboardType="number-pad" />
        <TextField label="Visina u cm (opciono)" value={heightCm} onChangeText={setHeightCm} keyboardType="number-pad" />
        <TextField label="Tezina u kg (opciono)" value={weightKg} onChangeText={setWeightKg} keyboardType="decimal-pad" />
        <ChoiceGroup label="Tip treninga" options={TRAINING_TYPE_OPTIONS} value={trainingType} onChange={setTrainingType} />
        <ChoiceGroup label="Iskustvo" options={EXPERIENCE_OPTIONS} value={experienceLevel} onChange={setExperienceLevel} />
      </View>

      {formError ? <Text className="text-center text-danger">{formError}</Text> : null}

      <Button label="Zapocni System" onPress={() => void handleSubmit()} loading={submitting} testID="onboarding-submit" />
    </Screen>
  );
}
