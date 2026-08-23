import tseslint from "typescript-eslint"

export default [
    {
        ignores: ["**/dist/", "**/dist/**", "eslint.config.mjs"]
    },

    ...tseslint.configs.recommended,
    ...tseslint.configs.stylistic,

    {
        files: ["**/*.ts", "**/*.tsx"],

        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",

            parserOptions: {
                projectService: true
            },

            globals: {
                console: "readonly",
                setTimeout: "readonly",
                TextDecoder: "readonly",
                process: "readonly",
                Buffer: "readonly",
                global: "readonly"
            }
        },

        rules: {
            "no-console": ["error"],
            "object-curly-spacing": ["error", "always"],
            semi: ["error", "never"],

            "sort-imports": [
                "error",
                {
                    ignoreCase: true,
                    ignoreDeclarationSort: false,
                    ignoreMemberSort: false,
                    memberSyntaxSortOrder: ["none", "all", "multiple", "single"],
                    allowSeparatedGroups: false
                }
            ],

            quotes: [
                "error",
                "double",
                {
                    allowTemplateLiterals: true
                }
            ],

            "@typescript-eslint/no-misused-promises": [
                "error",
                {
                    checksVoidReturn: {
                        attributes: false
                    }
                }
            ],

            "@typescript-eslint/consistent-indexed-object-style": "off",
            "@typescript-eslint/consistent-type-definitions": "off",
            "@typescript-eslint/no-inferrable-types": "off"
        }
    }
]
