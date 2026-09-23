import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { useI18n } from "../../src/i18n";
import { Screen } from "../../src/ui/Screen";

/**
 * Kontrolor podataka je Vukasin Popovic, individualni developer sa sedistem
 * u Republici Srbiji. Tekst je stvaran (nije placeholder), ali pravnu
 * reviziju pre veceg skaliranja (posebno obrade EU korisnika u vecem obimu)
 * i dalje preporucujemo.
 */
export default function PrivacyPolicyScreen() {
  const { t } = useI18n();

  return (
    <Screen>
      <Pressable onPress={() => router.back()} testID="privacy-back">
        <Text className="text-accent">{t("common.back")}</Text>
      </Pressable>

      <Text className="text-2xl font-bold text-neutral-50 dark:text-neutral-1000">{t("legal.privacyTitle")}</Text>
      <Text className="text-xs text-neutral-500 dark:text-neutral-600">{t("legal.lastUpdated")}</Text>

      <View className="gap-4">
        <Section title={t("legal.privacySection0Title")}>{t("legal.privacySection0Body")}</Section>
        <Section title={t("legal.privacySection1Title")}>{t("legal.privacySection1Body")}</Section>
        <Section title={t("legal.privacySection2Title")}>{t("legal.privacySection2Body")}</Section>
        <Section title={t("legal.privacySection3Title")}>{t("legal.privacySection3Body")}</Section>
        <Section title={t("legal.privacySection4Title")}>{t("legal.privacySection4Body")}</Section>
        <Section title={t("legal.privacySection5Title")}>{t("legal.privacySection5Body")}</Section>
        <Section title={t("legal.privacySection6Title")}>{t("legal.privacySection6Body")}</Section>
        <Section title={t("legal.privacySection7Title")}>{t("legal.privacySection7Body")}</Section>
      </View>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: string }) {
  return (
    <View className="gap-1.5">
      <Text className="text-sm font-semibold text-neutral-50 dark:text-neutral-1000">{title}</Text>
      <Text className="text-sm text-neutral-400 dark:text-neutral-700">{children}</Text>
    </View>
  );
}
