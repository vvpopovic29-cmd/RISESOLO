import { useState } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { onboardProfileRequestSchema, type OnboardProfileRequest } from "@risesolo/validation";
import { ApiError } from "@risesolo/api-client";
import { useAuth } from "../src/auth/AuthContext";
import { useI18n } from "../src/i18n";
import { Button } from "../src/ui/Button";
import { ChoiceGroup } from "../src/ui/ChoiceGroup";
import { Screen } from "../src/ui/Screen";
import { TextField } from "../src/ui/TextField";

/** Prazan string -> undefined, inace parsira broj (koristi se za opciona numericka polja onboarding forme). */
function parseOptionalNumber(text: string): number | undefined {
  const trimmed = text.trim();
  if (trimmed === "") return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export default function OnboardingScreen() {
  const { state, apiClient } = useAuth();
  const { t, locale } = useI18n();
  const currentUsername = state.status === "signedIn" ? state.user.username : "";

  const TRAINING_TYPE_OPTIONS = [
    { value: "CALISTHENICS", label: t("onboarding.trainingCalisthenics") },
    { value: "GYM", label: t("onboarding.trainingGym") },
    { value: "BOTH", label: t("onboarding.trainingBoth") },
  ] as const;

  const EXPERIENCE_OPTIONS = [
    { value: "BEGINNER", label: t("onboarding.experienceBeginner") },
    { value: "INTERMEDIATE", label: t("onboarding.experienceIntermediate") },
    { value: "ADVANCED", label: t("onboarding.experienceAdvanced") },
  ] as const;

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
      // Jezik uredjaja (pogodjen pre autentifikacije - vidi src/i18n) postaje
      // pocetna vrednost Profile.locale; korisnik ga kasnije moze promeniti
      // preko Settings ekrana (POST /players/me/locale).
      locale,
    };
    const parsed = onboardProfileRequestSchema.safeParse(dto);
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? t("onboarding.checkFields"));
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      await apiClient.players.onboard(parsed.data);
      router.replace("/");
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : t("onboarding.saveFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen>
      <View className="gap-1">
        <Text className="text-2xl font-bold text-neutral-50 dark:text-neutral-1000">{t("onboarding.title")}</Text>
        <Text className="text-neutral-500 dark:text-neutral-600">{t("onboarding.subtitle")}</Text>
      </View>

      <View className="gap-4">
        <TextField label={t("onboarding.usernameLabel")} value={username} onChangeText={setUsername} autoCapitalize="none" />
        <TextField label={t("onboarding.ageLabel")} value={age} onChangeText={setAge} keyboardType="number-pad" />
        <TextField label={t("onboarding.heightLabel")} value={heightCm} onChangeText={setHeightCm} keyboardType="number-pad" />
        <TextField label={t("onboarding.weightLabel")} value={weightKg} onChangeText={setWeightKg} keyboardType="decimal-pad" />
        <ChoiceGroup
          label={t("onboarding.trainingTypeLabel")}
          options={TRAINING_TYPE_OPTIONS}
          value={trainingType}
          onChange={setTrainingType}
        />
        <ChoiceGroup
          label={t("onboarding.experienceLabel")}
          options={EXPERIENCE_OPTIONS}
          value={experienceLevel}
          onChange={setExperienceLevel}
        />
      </View>

      {formError ? <Text className="text-center text-danger">{formError}</Text> : null}

      <Button label={t("onboarding.submit")} onPress={() => void handleSubmit()} loading={submitting} testID="onboarding-submit" />
    </Screen>
  );
}
