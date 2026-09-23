import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { ApiError } from "@risesolo/api-client";
import type { Locale } from "@risesolo/domain";
import { useAuth } from "../src/auth/AuthContext";
import { useI18n, SUPPORTED_LOCALES } from "../src/i18n";
import { Screen } from "../src/ui/Screen";

const LOCALE_LABEL_KEY: Record<Locale, "settings.languageEnglish" | "settings.languageSerbian"> = {
  en: "settings.languageEnglish",
  sr: "settings.languageSerbian",
};

/** Jedini mesto gde korisnik menja jezik posle onboardinga - POST /players/me/locale odmah utice na naredne pozive backend kataloga (quest/item/shop nazivi), vidi apps/api/src/common/locale.ts. */
export default function SettingsScreen() {
  const { apiClient } = useAuth();
  const { locale, setLocale, t } = useI18n();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSelect(next: Locale) {
    if (next === locale || saving) return;
    setSaving(true);
    setError(null);
    const previous = locale;
    setLocale(next);
    try {
      await apiClient.players.updateLocale({ locale: next });
    } catch (err) {
      setLocale(previous);
      setError(err instanceof ApiError ? err.message : t("settings.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <Pressable onPress={() => router.back()} testID="settings-back">
        <Text className="text-accent">{t("common.back")}</Text>
      </Pressable>

      <Text className="text-2xl font-bold text-neutral-50 dark:text-neutral-1000">{t("settings.title")}</Text>

      <View className="gap-2">
        <Text className="text-sm font-semibold text-neutral-400 dark:text-neutral-700">{t("settings.language")}</Text>
        <View className="gap-2">
          {SUPPORTED_LOCALES.map((option) => {
            const selected = option === locale;
            return (
              <Pressable
                key={option}
                onPress={() => void handleSelect(option)}
                testID={`settings-locale-${option}`}
                className={`rounded-lg border p-3 ${selected ? "border-accent bg-accent/10" : "border-neutral-700 dark:border-neutral-400"}`}
              >
                <Text className={selected ? "font-semibold text-accent" : "text-neutral-50 dark:text-neutral-1000"}>
                  {t(LOCALE_LABEL_KEY[option])}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {error ? <Text className="text-center text-danger">{error}</Text> : null}
    </Screen>
  );
}
