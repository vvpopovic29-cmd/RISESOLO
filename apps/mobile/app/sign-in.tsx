import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Redirect } from "expo-router";
import { useAuth } from "../src/auth/AuthProvider";

export default function SignInScreen() {
  const { session, loading, signInWithPassword, signUpWithPassword } = useAuth();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!loading && session) {
    return <Redirect href="/" />;
  }

  const canSubmit = email.trim().length > 0 && password.length > 0 && !submitting;

  async function handleSubmit(): Promise<void> {
    setSubmitting(true);
    setError(null);
    const action = mode === "sign-in" ? signInWithPassword : signUpWithPassword;
    const result = await action(email.trim(), password);
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
    }
  }

  return (
    <View className="flex-1 items-center justify-center gap-6 bg-neutral-1000 px-6 dark:bg-neutral-50">
      <View className="items-center gap-1">
        <Text className="text-4xl font-bold text-neutral-50 dark:text-neutral-1000">RISESOLO</Text>
        <Text className="text-base text-neutral-500 dark:text-neutral-700">
          {mode === "sign-in" ? "Uloguj se da nastavis" : "Kreiraj Player nalog"}
        </Text>
      </View>

      <View className="w-full max-w-sm gap-3">
        <TextInput
          testID="sign-in-email"
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          placeholderTextColor="#5B5D6B"
          className="rounded-md border border-neutral-500 px-3 py-2 text-neutral-50 dark:text-neutral-1000"
        />
        <TextInput
          testID="sign-in-password"
          value={password}
          onChangeText={setPassword}
          placeholder="Lozinka"
          secureTextEntry
          placeholderTextColor="#5B5D6B"
          className="rounded-md border border-neutral-500 px-3 py-2 text-neutral-50 dark:text-neutral-1000"
        />

        {error ? (
          <Text testID="sign-in-error" className="text-danger">
            {error}
          </Text>
        ) : null}

        <Pressable
          testID="sign-in-submit"
          onPress={handleSubmit}
          disabled={!canSubmit}
          className={`items-center rounded-md bg-accent px-4 py-2 ${canSubmit ? "" : "opacity-50"}`}
        >
          <Text className="font-semibold text-neutral-50">
            {submitting ? "..." : mode === "sign-in" ? "Uloguj se" : "Registruj se"}
          </Text>
        </Pressable>

        <Pressable
          testID="sign-in-toggle-mode"
          onPress={() => {
            setMode(mode === "sign-in" ? "sign-up" : "sign-in");
            setError(null);
          }}
        >
          <Text className="text-center text-neutral-500 dark:text-neutral-700">
            {mode === "sign-in" ? "Nemas nalog? Registruj se" : "Vec imas nalog? Uloguj se"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
