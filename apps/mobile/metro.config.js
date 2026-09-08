const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// `react-native-css-interop` je nativewind-ova peer-kvalifikovana zavisnost.
// Pod strogim pnpm workspace-om nije direktno resolvabilna iz app koda koje
// je importuje preko babel `jsxImportSource` podesavanja (vidi babel.config.js),
// pa je eksplicitno mapiramo na instalaciju koju stvarno koristi nativewind.
const nativewindPackageJson = require.resolve("nativewind/package.json");
const cssInteropPackageJson = require.resolve("react-native-css-interop/package.json", {
  paths: [path.dirname(nativewindPackageJson)],
});

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  "react-native-css-interop": path.dirname(cssInteropPackageJson),
};

module.exports = withNativeWind(config, { input: "./global.css" });
