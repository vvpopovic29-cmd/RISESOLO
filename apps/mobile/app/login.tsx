import { useState } from "react";
import { Text, View } from "react-native";
import { Link, router } from "expo-router";
import { loginRequestSchema } from "@risesolo/validation";
import { ApiError } from "@risesolo/api-client";
import { useAuth } from "../src/auth/AuthContext";
import { useI18n } from "../src/i18n";
import { Button } from "../src/ui/Button";
import { Screen } from "../src/ui/Screen";
import { TextField } from "../src/ui/TextField";

export default function LoginScreen() {
  const { login } = useAuth();
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit() {
    const parsed = loginRequestSchema.safeParse({ email: email.trim(), password });
    if (!parsed.success) {
      setFormError(t("auth.loginInvalid"));
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      await login(parsed.data);
      router.replace("/");
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : t("auth.loginFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen>
      <View className="flex-1 justify-center gap-8">
        <View className="items-center gap-1">
          <Text className="text-3xl font-bold text-neutral-50 dark:text-neutral-1000">{t("auth.loginTitle")}</Text>
          <Text className="text-neutral-500 dark:text-neutral-600">{t("auth.loginSubtitle")}</Text>
        </View>

        <View className="gap-4">
          <TextField
            label={t("auth.emailLabel")}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            testID="login-email"
          />
          <TextField
            label={t("auth.passwordLabel")}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            testID="login-password"
          />
        </View>

        {formError ? (
          <Text testID="login-error" className="text-center text-danger">
            {formError}
          </Text>
        ) : null}

        <Button label={t("auth.loginSubmit")} onPress={() => void handleSubmit()} loading={submitting} testID="login-submit" />

        <Link href="/register" className="text-center text-accent">
          {t("auth.goToRegister")}
        </Link>
      </View>
    </Screen>
  );
}
