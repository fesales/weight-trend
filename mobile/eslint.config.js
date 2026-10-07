// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    // src/dev is temporary scaffolding (removed in step 6) and fails react-hooks/set-state-in-effect.
    ignores: ["dist/*", "src/dev/**"],
  },
]);
