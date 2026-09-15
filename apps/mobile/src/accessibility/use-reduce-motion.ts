import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

/**
 * Prati OS "Reduce Motion" podesavanje (Arhitektonsko pravilo #8 - sve
 * animacije moraju ga postovati). Pocinje na `false` (bez animacije-blokiranja
 * dok se async vrednost ne ucita) i azurira se i na promenu u toku sesije.
 */
export function useReduceMotion(): boolean {
  const [reduceMotionEnabled, setReduceMotionEnabled] = useState(false);

  useEffect(() => {
    let isMounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (isMounted) setReduceMotionEnabled(enabled);
    });

    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotionEnabled,
    );

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  return reduceMotionEnabled;
}
