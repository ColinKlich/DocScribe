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
          brands: ["DocScribe", "Obsidian", "OpenAI", "Ollama", "REST", "API", "JSON","URL", "Anthropic", "Google", "Gemini", "GPT-4", "GPT-3.5", "Claude", 'Mistral', "Mistral AI", "OpenRouter"],
          acronyms: ["OK"],
          enforceCamelCaseLower: true,
        },
      ],
      "no-undef": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
]);

