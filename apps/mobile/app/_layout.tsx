import "../global.css";
import { useEffect } from "react";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "nativewind";
import { AuthProvider } from "../src/auth/AuthContext";
import { initSentry } from "../src/monitoring/sentry";
import { addNotificationTapListener } from "../src/notifications/push-notifications";

initSentry();

export default function RootLayout() {
  const { setColorScheme } = useColorScheme();

  useEffect(() => {
    // Dark je podrazumevana tema (Arhitektonsko pravilo #7); korisnik je
    // i dalje moze promeniti u toku sesije (vidi toggle na pocetnom ekranu).
    setColorScheme("dark");
  }, [setColorScheme]);

  useEffect(() => {
    // Tap na push notifikaciju navigira na ekran naveden u `data.screen`
    // (postavljeno na serveru - vidi apps/api/src/notifications). Bez tog
    // polja ne radi nista (npr. generalna/nepoznata notifikacija).
    return addNotificationTapListener((data) => {
      if (typeof data.screen === "string") {
        router.push(data.screen as never);
      }
    });
  }, []);

  return (
    <AuthProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </AuthProvider>
  );
}
