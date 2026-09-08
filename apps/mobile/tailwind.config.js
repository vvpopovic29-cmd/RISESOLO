/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require("nativewind/preset"), require("@risesolo/design-tokens/tailwind-preset")],
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  plugins: [],
};
