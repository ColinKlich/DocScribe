// eslint.config.mjs
import tsparser from "@typescript-eslint/parser";
import { defineConfig } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";

export default defineConfig([
  ...obsidianmd.configs.recommended,
  {
    ignores: ["node_modules/", "main.js", "eslint.config.js"],
  },
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      parser: tsparser,
      parserOptions: { project: "./tsconfig.json" },
    },
    // You can add your own configuration to override or add rules
    rules: {
      "obsidianmd/ui/sentence-case": [
        "warn",
        {
          brands: ["DocScribe", "Obsidian"],
          acronyms: ["OK"],
          enforceCamelCaseLower: true,
        },
      ],
      "no-undef": "off",
    },
  },
]);

