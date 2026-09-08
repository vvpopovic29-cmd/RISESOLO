/**
 * Arhitektonsko pravilo #9: Cyan, Purple, Gold, Emerald, Blue, Orange i Red
 * se ne smeju koristiti nigde u aplikaciji OSIM za ovde definisanu semanticku
 * namenu. Svaka od te 7 boja ima tacno jedan semanticki token ispod, i samo
 * taj token sme referencirati njenu paletu. Sve ostalo (pozadine, povrsine,
 * tekst, ivice) mora koristiti neutralnu (slate) skalu.
 *
 *   accent  (Cyan)    -> primarna interaktivna boja, "System" glow, fokus prsten
 *   success (Emerald)  -> uspesno zavrsene akcije, kompletirani questovi
 *   danger  (Red)      -> greske, destruktivne akcije, gubitak zdravlja
 *   warning (Orange)   -> upozorenja, granicna/rizicna stanja
 *   info    (Blue)     -> informativne poruke, linkovi
 *   reward  (Gold)     -> gold ekonomija, nagrade, streakovi
 *   premium (Purple)   -> guild/rank prestiz, retki ili legendarni elementi
 */
export const semanticColorPurpose = {
  accent: "cyan",
  success: "emerald",
  danger: "red",
  warning: "orange",
  info: "blue",
  reward: "gold",
  premium: "purple",
} as const;

/** Neutralna (slate) skala - jedina paleta slobodna za opstu upotrebu u UI-ju. */
export const neutral = {
  0: "#000000",
  50: "#0A0A0F",
  100: "#111117",
  200: "#1A1B23",
  300: "#26272F",
  400: "#3A3B45",
  500: "#5B5D6B",
  600: "#83848F",
  700: "#AEB0B8",
  800: "#D6D7DC",
  900: "#F4F4F6",
  1000: "#FFFFFF",
} as const;

/** Rezervisane semanticke boje - koristiti ISKLJUCIVO za namenu iz {@link semanticColorPurpose}. */
export const semantic = {
  accent: { subtle: "#0E7490", DEFAULT: "#22D3EE", strong: "#A5F3FC" },
  success: { subtle: "#065F46", DEFAULT: "#10B981", strong: "#6EE7B7" },
  danger: { subtle: "#7F1D1D", DEFAULT: "#EF4444", strong: "#FCA5A5" },
  warning: { subtle: "#7C2D12", DEFAULT: "#F97316", strong: "#FDBA74" },
  info: { subtle: "#1E3A8A", DEFAULT: "#3B82F6", strong: "#93C5FD" },
  reward: { subtle: "#78350F", DEFAULT: "#F59E0B", strong: "#FCD34D" },
  premium: { subtle: "#4C1D95", DEFAULT: "#A855F7", strong: "#D8B4FE" },
} as const;

export const colors = {
  neutral,
  semantic,
  dark: {
    background: neutral[50],
    surface: neutral[200],
    surfaceRaised: neutral[300],
    border: neutral[400],
    textPrimary: neutral[1000],
    textSecondary: neutral[700],
    textMuted: neutral[600],
  },
  light: {
    background: neutral[1000],
    surface: neutral[900],
    surfaceRaised: neutral[800],
    border: neutral[700],
    textPrimary: neutral[50],
    textSecondary: neutral[400],
    textMuted: neutral[500],
  },
} as const;

export type ThemeName = "dark" | "light";
export type SemanticColorName = keyof typeof semantic;
