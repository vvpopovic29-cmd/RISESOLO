/**
 * Podrzani jezici (Faza lansiranja: EN + SR, vidi README "Lokalizacija").
 * Deljeno izmedju apps/api (bira koji tekst kataloga da vrati) i apps/mobile
 * (bira koji tekst UI chrome-a da prikaze) - jedan izvor istine da se ne bi
 * razisli.
 */
export const LOCALES = ["en", "sr"] as const;
export type Locale = (typeof LOCALES)[number];

/** SR je istorijski podrazumevani jezik ovog projekta (postojeci sadrzaj pre i18n faze). */
export const DEFAULT_LOCALE: Locale = "sr";

export function isLocale(value: string | null | undefined): value is Locale {
  return value !== null && value !== undefined && (LOCALES as readonly string[]).includes(value);
}
