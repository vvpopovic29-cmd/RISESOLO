import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import type { PurchasesOffering, PurchasesPackage } from "react-native-purchases";
import { useAuth } from "../src/auth/AuthContext";
import { getCurrentOffering, purchasePackage, restorePurchases } from "../src/subscriptions/purchases";
import { useSubscriptionStatus } from "../src/subscriptions/use-subscription-status";
import { Button } from "../src/ui/Button";
import { Screen } from "../src/ui/Screen";

/**
 * Orijentaciona cena dok Store/RevenueCat konfiguracija nije zavrsena (vidi
 * README "Subscriptions/RevenueCat") - stvarne cene dolaze iz
 * `offering.availablePackages[].product.priceString` (lokalizovano preko
 * Store-a) cim su proizvodi kreirani u App Store Connect/Google Play Console.
 */
const ESTIMATED_PACKAGES = [
  { id: "monthly_pro", label: "Mesecno", price: "$6.99 / mesec" },
  { id: "annual_pro", label: "Godisnje", price: "$49.99 / godinu (~40% popusta)" },
];

export default function PaywallScreen() {
  const { apiClient } = useAuth();
  const { state: subscriptionState, refetch: refetchSubscription } = useSubscriptionStatus(apiClient);

  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [offeringLoading, setOfferingLoading] = useState(true);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  useEffect(() => {
    getCurrentOffering()
      .then(setOffering)
      .finally(() => setOfferingLoading(false));
  }, []);

  async function handlePurchase(pkg: PurchasesPackage) {
    setPurchasingId(pkg.identifier);
    setActionError(null);
    const result = await purchasePackage(pkg);
    setPurchasingId(null);
    if (result.success) {
      refetchSubscription();
      router.back();
      return;
    }
    if (!result.userCancelled) {
      setActionError(result.errorMessage ?? "Kupovina nije uspela.");
    }
  }

  async function handleRestore() {
    setRestoring(true);
    setActionError(null);
    setActionNotice(null);
    const result = await restorePurchases();
    setRestoring(false);
    if (result.success) {
      refetchSubscription();
      setActionNotice(result.isPro ? "Pretplata je uspesno vracena." : "Nema aktivnih kupovina za obnovu.");
    } else {
      setActionError(result.errorMessage ?? "Obnova kupovina nije uspela.");
    }
  }

  const isPro = subscriptionState.status === "success" && subscriptionState.data.isPro;

  return (
    <Screen>
      <Pressable onPress={() => router.back()} testID="paywall-back">
        <Text className="text-accent">{"< Nazad"}</Text>
      </Pressable>

      <View className="gap-1">
        <Text className="text-2xl font-bold text-neutral-50 dark:text-neutral-1000">RISESOLO Pro</Text>
        <Text className="text-sm text-neutral-500 dark:text-neutral-600">
          Neograniceni AI trening planovi i buduce premium funkcije.
        </Text>
      </View>

      {isPro ? (
        <View className="gap-2 rounded-lg border border-premium/40 bg-premium/10 p-4" testID="paywall-already-pro">
          <Text className="font-semibold text-premium">Vec imas aktivnu Pro pretplatu.</Text>
          {subscriptionState.status === "success" && subscriptionState.data.expiresAt ? (
            <Text className="text-xs text-neutral-500 dark:text-neutral-600">
              Vazi do {new Date(subscriptionState.data.expiresAt).toLocaleDateString()}
              {subscriptionState.data.willRenew ? " (automatski se obnavlja)" : " (nece se automatski obnoviti)"}
            </Text>
          ) : null}
        </View>
      ) : (
        <View className="gap-3">
          {offeringLoading ? (
            <Text className="text-neutral-500 dark:text-neutral-600">Ucitavam ponude...</Text>
          ) : offering && offering.availablePackages.length > 0 ? (
            offering.availablePackages.map((pkg) => (
              <View
                key={pkg.identifier}
                className="gap-2 rounded-lg border border-neutral-700 p-4 dark:border-neutral-400"
              >
                <Text className="font-semibold text-neutral-50 dark:text-neutral-1000">{pkg.product.title}</Text>
                <Text className="text-lg font-bold text-reward">{pkg.product.priceString}</Text>
                <Button
                  label="Pretplati se"
                  onPress={() => void handlePurchase(pkg)}
                  loading={purchasingId === pkg.identifier}
                  testID={`purchase-${pkg.identifier}`}
                />
              </View>
            ))
          ) : (
            <View
              testID="paywall-no-offerings"
              className="gap-2 rounded-lg border border-neutral-700 p-4 dark:border-neutral-400"
            >
              <Text className="text-sm text-neutral-500 dark:text-neutral-600">
                Ponude jos nisu dostupne (Store/RevenueCat konfiguracija u toku). Orijentaciona cena:
              </Text>
              {ESTIMATED_PACKAGES.map((pkg) => (
                <View key={pkg.id} className="flex-row items-center justify-between">
                  <Text className="text-neutral-50 dark:text-neutral-1000">{pkg.label}</Text>
                  <Text className="font-semibold text-reward">{pkg.price}</Text>
                </View>
              ))}
            </View>
          )}

          {actionError ? <Text className="text-danger">{actionError}</Text> : null}
          {actionNotice ? <Text className="text-success">{actionNotice}</Text> : null}

          <Button
            label="Vrati kupovine (Restore Purchases)"
            variant="secondary"
            onPress={() => void handleRestore()}
            loading={restoring}
            testID="restore-purchases-button"
          />
        </View>
      )}

      <View className="gap-1.5 border-t border-neutral-700 pt-4 dark:border-neutral-400">
        <Text className="text-xs text-neutral-500 dark:text-neutral-600">
          Pretplata se automatski obnavlja po ceni vazecoj u trenutku obnove, osim ako se ne otkaze najmanje 24 sata
          pre isteka tekuceg perioda. Otkazivanje se radi u podesavanjima naloga na App Store-u (iOS) ili Google
          Play-u (Android) - RISESOLO nema pristup tvojim placanjima.
        </Text>
        <View className="flex-row gap-4">
          <Pressable onPress={() => router.push("/legal/terms")} testID="paywall-terms-link">
            <Text className="text-xs text-accent underline">Uslovi koriscenja</Text>
          </Pressable>
          <Pressable onPress={() => router.push("/legal/privacy")} testID="paywall-privacy-link">
            <Text className="text-xs text-accent underline">Politika privatnosti</Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}
