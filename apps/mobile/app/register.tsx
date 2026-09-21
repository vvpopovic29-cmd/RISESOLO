import { useState } from "react";
import { Text, View } from "react-native";
import { Link, router } from "expo-router";
import { registerRequestSchema } from "@risesolo/validation";
import { ApiError } from "@risesolo/api-client";
import { useAuth } from "../src/auth/AuthContext";
import { useI18n } from "../src/i18n";
import { Button } from "../src/ui/Button";
import { Screen } from "../src/ui/Screen";
import { TextField } from "../src/ui/TextField";

export default function RegisterScreen() {
  const { register } = useAuth();
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit() {
    const parsed = registerRequestSchema.safeParse({ email: email.trim(), username: username.trim(), password });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? t("auth.registerCheckFields"));
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      await register(parsed.data);
      router.replace("/");
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : t("auth.registerFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen>
      <View className="flex-1 justify-center gap-8">
        <View className="items-center gap-1">
          <Text className="text-3xl font-bold text-neutral-50 dark:text-neutral-1000">{t("auth.registerTitle")}</Text>
          <Text className="text-neutral-500 dark:text-neutral-600">{t("auth.registerSubtitle")}</Text>
        </View>

        <View className="gap-4">
          <TextField
            label={t("auth.usernameLabel")}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            testID="register-username"
          />
          <TextField
            label={t("auth.emailLabel")}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            testID="register-email"
          />
          <TextField
            label={t("auth.passwordLabel")}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            testID="register-password"
          />
        </View>

        {formError ? (
          <Text testID="register-error" className="text-center text-danger">
            {formError}
          </Text>
        ) : null}

        <Button
          label={t("auth.registerSubmit")}
          onPress={() => void handleSubmit()}
          loading={submitting}
          testID="register-submit"
        />

        <Link href="/login" className="text-center text-accent">
          {t("auth.goToLogin")}
        </Link>
      </View>
    </Screen>
  );
}
