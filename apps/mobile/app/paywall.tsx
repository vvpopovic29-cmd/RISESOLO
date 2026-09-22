import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import type { PurchasesOffering, PurchasesPackage } from "react-native-purchases";
import { useAuth } from "../src/auth/AuthContext";
import { useI18n } from "../src/i18n";
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
  { id: "monthly_pro", labelKey: "paywall.estimatedMonthlyLabel", priceKey: "paywall.estimatedMonthlyPrice" },
  { id: "annual_pro", labelKey: "paywall.estimatedAnnualLabel", priceKey: "paywall.estimatedAnnualPrice" },
] as const;

export default function PaywallScreen() {
  const { apiClient } = useAuth();
  const { t, locale } = useI18n();
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
      setActionError(result.errorMessage ?? t("paywall.purchaseFailed"));
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
      setActionNotice(result.isPro ? t("paywall.restoreSuccess") : t("paywall.restoreNoPurchases"));
    } else {
      setActionError(result.errorMessage ?? t("paywall.restoreFailed"));
    }
  }

  const isPro = subscriptionState.status === "success" && subscriptionState.data.isPro;

  return (
    <Screen>
      <Pressable onPress={() => router.back()} testID="paywall-back">
        <Text className="text-accent">{t("common.back")}</Text>
      </Pressable>

      <View className="gap-1">
        <Text className="text-2xl font-bold text-neutral-50 dark:text-neutral-1000">{t("paywall.title")}</Text>
        <Text className="text-sm text-neutral-500 dark:text-neutral-600">
          {t("paywall.subtitle")}
        </Text>
      </View>

      {isPro ? (
        <View className="gap-2 rounded-lg border border-premium/40 bg-premium/10 p-4" testID="paywall-already-pro">
          <Text className="font-semibold text-premium">{t("paywall.alreadyPro")}</Text>
          {subscriptionState.status === "success" && subscriptionState.data.expiresAt ? (
            <Text className="text-xs text-neutral-500 dark:text-neutral-600">
              {t("paywall.validUntil", {
                date: new Date(subscriptionState.data.expiresAt).toLocaleDateString(
                  locale === "en" ? "en-US" : "sr-Latn-RS",
                ),
              })}
              {subscriptionState.data.willRenew ? t("paywall.autoRenews") : t("paywall.notRenewing")}
            </Text>
          ) : null}
        </View>
      ) : (
        <View className="gap-3">
          {offeringLoading ? (
            <Text className="text-neutral-500 dark:text-neutral-600">{t("paywall.loadingOfferings")}</Text>
          ) : offering && offering.availablePackages.length > 0 ? (
            offering.availablePackages.map((pkg) => (
              <View
                key={pkg.identifier}
                className="gap-2 rounded-lg border border-neutral-700 p-4 dark:border-neutral-400"
              >
                <Text className="font-semibold text-neutral-50 dark:text-neutral-1000">{pkg.product.title}</Text>
                <Text className="text-lg font-bold text-reward">{pkg.product.priceString}</Text>
                <Button
                  label={t("paywall.subscribe")}
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
                {t("paywall.offeringsUnavailable")}
              </Text>
              {ESTIMATED_PACKAGES.map((pkg) => (
                <View key={pkg.id} className="flex-row items-center justify-between">
                  <Text className="text-neutral-50 dark:text-neutral-1000">{t(pkg.labelKey)}</Text>
                  <Text className="font-semibold text-reward">{t(pkg.priceKey)}</Text>
                </View>
              ))}
            </View>
          )}

          {actionError ? <Text className="text-danger">{actionError}</Text> : null}
          {actionNotice ? <Text className="text-success">{actionNotice}</Text> : null}

          <Button
            label={t("paywall.restorePurchases")}
            variant="secondary"
            onPress={() => void handleRestore()}
            loading={restoring}
            testID="restore-purchases-button"
          />
        </View>
      )}

      <View className="gap-1.5 border-t border-neutral-700 pt-4 dark:border-neutral-400">
        <Text className="text-xs text-neutral-500 dark:text-neutral-600">
          {t("paywall.legalDisclaimer")}
        </Text>
        <View className="flex-row gap-4">
          <Pressable onPress={() => router.push("/legal/terms")} testID="paywall-terms-link">
            <Text className="text-xs text-accent underline">{t("paywall.termsLink")}</Text>
          </Pressable>
          <Pressable onPress={() => router.push("/legal/privacy")} testID="paywall-privacy-link">
            <Text className="text-xs text-accent underline">{t("paywall.privacyLink")}</Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}
