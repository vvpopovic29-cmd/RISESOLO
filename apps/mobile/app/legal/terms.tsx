import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { useI18n } from "../../src/i18n";
import { Screen } from "../../src/ui/Screen";

/**
 * RISESOLO aplikaciju razvija i odrzava Vukasin Popovic, individualni
 * developer sa sedistem u Republici Srbiji. Tekst je stvaran (nije
 * placeholder), ali pravnu reviziju pre veceg skaliranja i dalje
 * preporucujemo.
 */
export default function TermsOfUseScreen() {
  const { t } = useI18n();

  return (
    <Screen>
      <Pressable onPress={() => router.back()} testID="terms-back">
        <Text className="text-accent">{t("common.back")}</Text>
      </Pressable>

      <Text className="text-2xl font-bold text-neutral-50 dark:text-neutral-1000">{t("legal.termsTitle")}</Text>
      <Text className="text-xs text-neutral-500 dark:text-neutral-600">{t("legal.lastUpdated")}</Text>

      <View className="gap-4">
        <Section title={t("legal.termsSection0Title")}>{t("legal.termsSection0Body")}</Section>
        <Section title={t("legal.termsSection1Title")}>{t("legal.termsSection1Body")}</Section>
        <Section title={t("legal.termsSection2Title")}>{t("legal.termsSection2Body")}</Section>
        <Section title={t("legal.termsSection3Title")}>{t("legal.termsSection3Body")}</Section>
        <Section title={t("legal.termsSection4Title")}>{t("legal.termsSection4Body")}</Section>
        <Section title={t("legal.termsSection5Title")}>{t("legal.termsSection5Body")}</Section>
        <Section title={t("legal.termsSection6Title")}>{t("legal.termsSection6Body")}</Section>
        <Section title={t("legal.termsSection7Title")}>{t("legal.termsSection7Body")}</Section>
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
