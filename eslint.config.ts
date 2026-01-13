import type { Linter } from "eslint";
import pedantryConfig from "./.pedantry/eslint.config.ts";

const config: Linter.Config[] = [
  ...pedantryConfig,
  // Add your project-specific overrides here
];

export default config;
