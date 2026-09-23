import { Text, View } from "react-native";
import { Redirect } from "expo-router";
import { useAuth } from "../src/auth/AuthContext";
import { useI18n } from "../src/i18n";
import { Screen } from "../src/ui/Screen";

/**
 * Auth gate - ne renderuje UI, samo odlucuje gde da preusmeri na osnovu
 * persist-ovanog auth stanja (vidi AuthContext.tsx). Onboarding gate
 * (profile.onboarded) zivi u app/home.tsx, jer se tamo vec cita player
 * state preko GET /players/me - nema potrebe za dodatnim mrezenim pozivom
 * ovde samo da bi se odlucilo da li da se ide na /onboarding.
 */
export default function IndexGate() {
  const { state } = useAuth();
  const { t } = useI18n();

  if (state.status === "loading") {
    return (
      <Screen scroll={false}>
        <View className="flex-1 items-center justify-center">
          <Text className="text-neutral-500 dark:text-neutral-600">{t("common.loadingApp")}</Text>
        </View>
      </Screen>
    );
  }

  if (state.status === "signedOut") {
    return <Redirect href="/login" />;
  }

  return <Redirect href="/home" />;
}
