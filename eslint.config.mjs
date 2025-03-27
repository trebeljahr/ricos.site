import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
});

const eslintConfig = [
  ...compat.config({
    extends: ["next"],
    rules: {
      "react/display-name": "off",
      "react/rules-of-hooks": "off",
      "react/exhaustive-deps": "off",
    },
  }),
];
export default eslintConfig;
