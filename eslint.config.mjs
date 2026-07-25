import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["**/dist/**", "**/node_modules/**", "docs/**"],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@creator-platform/*/src/**", "../../packages/*/src/**"],
              message:
                "Import from a package's public exports instead of its internals.",
            },
            {
              group: ["apps/**", "../../apps/**", "../../../apps/**"],
              message:
                "Workspace packages must not depend on application internals.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["apps/web/**/*.ts", "apps/web/**/*.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@creator-platform/database",
                "@creator-platform/database/**",
                "@creator-platform/hedera",
                "@creator-platform/hedera/**",
                "@hashgraph/sdk",
              ],
              message:
                "Web may use only shared, ui, and api-client workspace packages.",
            },
            {
              group: [
                "@creator-platform/*/src/**",
                "../../packages/*/src/**",
                "apps/**",
              ],
              message:
                "Import only public package exports; application internals are forbidden.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["packages/shared/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@creator-platform/*",
                "@hashgraph/sdk",
                "@nestjs/**",
                "@prisma/**",
                "react",
                "react/**",
              ],
              message:
                "Shared contracts must remain framework and adapter independent.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["packages/api-client/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@creator-platform/database",
                "@creator-platform/hedera",
                "@hashgraph/sdk",
                "@nestjs/**",
                "@prisma/**",
              ],
              message:
                "The browser API client cannot depend on server adapters.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["packages/hedera/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@creator-platform/api-client",
                "@creator-platform/database",
                "@creator-platform/ui",
                "apps/**",
                "../../apps/**",
              ],
              message:
                "The Hedera adapter may depend only on shared contracts and SDK clients.",
            },
          ],
        },
      ],
    },
  },
);
