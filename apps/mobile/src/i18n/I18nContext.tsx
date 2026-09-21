import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import * as Localization from "expo-localization";
import { LOCALES, type Locale } from "@risesolo/domain";
import en, { type Messages } from "./locales/en";
import sr from "./locales/sr";

const MESSAGES: Record<Locale, Messages> = { en, sr };

/**
 * Pogadja pocetni jezik iz jezika uredjaja PRE nego sto znamo Profile.locale
 * (npr. na Login/Register ekranu, pre autentifikacije) - sr/hr/bs idu na
 * srpski (postojeci sadrzaj), sve ostalo na engleski (globalni podrazumevani
 * jezik, vidi README "Lokalizacija"). Profile.locale (server-authoritative)
 * preuzima ovo cim se ucita (vidi home.tsx usePlayerState efekat).
 */
function guessDeviceLocale(): Locale {
  const languageCode = Localization.getLocales()[0]?.languageCode?.toLowerCase();
  if (languageCode === "sr" || languageCode === "hr" || languageCode === "bs") {
    return "sr";
  }
  return "en";
}

type NestedKeyOf<T> = { [K in keyof T & string]: `${K}.${keyof T[K] & string}` }[keyof T & string];

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: NestedKeyOf<Messages>, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() => guessDeviceLocale());

  const t = useCallback(
    (key: NestedKeyOf<Messages>, vars?: Record<string, string | number>): string => {
      const [namespace, field] = key.split(".") as [keyof Messages, string];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dinamicko razresavanje ugnjezdenog kljuca, tip je vec garantovan preko NestedKeyOf<Messages>
      const template = (MESSAGES[locale][namespace] as any)[field] as string;
      if (!vars) return template;
      return Object.entries(vars).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, String(value)), template);
    },
    [locale],
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n() mora biti pozvan unutar <I18nProvider>");
  }
  return context;
}

export const SUPPORTED_LOCALES = LOCALES;
