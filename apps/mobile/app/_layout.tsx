import "react-native-url-polyfill/auto";
import "../global.css";
import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "nativewind";
import { AuthProvider } from "../src/auth/AuthProvider";

export default function RootLayout() {
  const { setColorScheme } = useColorScheme();

  useEffect(() => {
    // Dark je podrazumevana tema (Arhitektonsko pravilo #7); korisnik je
    // i dalje moze promeniti u toku sesije (vidi toggle na pocetnom ekranu).
    setColorScheme("dark");
  }, [setColorScheme]);

  return (
    <AuthProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </AuthProvider>
  );
}
