import { colors } from "./colors";
import { radius, spacing } from "./spacing";
import { fontSize } from "./typography";

const px = (value: number) => `${value}px`;
const mapToPx = (scale: Record<string, number>) =>
  Object.fromEntries(Object.entries(scale).map(([key, value]) => [key, px(value)]));

/**
 * NativeWind/Tailwind preset generisan iz design tokena. Koristiti u
 * `apps/mobile/tailwind.config.js` preko `presets: [require("@risesolo/design-tokens/tailwind-preset")]`.
 *
 * Pozadina/tekst/ivice za dark i light temu se u komponentama biraju
 * direktno iz `neutral` skale preko Tailwind-ovog `dark:` varijanta
 * (npr. `bg-neutral-50 dark:bg-neutral-1000`), a NE preko posebnog
 * "background"/"surface" tokena - tako teme ostaju iskljucivo Tailwind-ove
 * i automatski prate `dark:` varijantu. `colors.dark` / `colors.light` iz
 * `./colors` ostaju za buduce ne-Tailwind potrosace (Reanimated/Skia stilovi).
 */
const tailwindPreset = {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        accent: colors.semantic.accent,
        success: colors.semantic.success,
        danger: colors.semantic.danger,
        warning: colors.semantic.warning,
        info: colors.semantic.info,
        reward: colors.semantic.reward,
        premium: colors.semantic.premium,
        neutral: colors.neutral,
      },
      spacing: mapToPx(spacing),
      borderRadius: {
        ...mapToPx(Object.fromEntries(Object.entries(radius).filter(([key]) => key !== "full"))),
        full: "9999px",
      },
      fontSize: mapToPx(fontSize),
    },
  },
};

export = tailwindPreset;
