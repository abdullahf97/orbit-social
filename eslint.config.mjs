import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const config = [
  ...nextVitals,
  ...nextTypescript,
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "src/generated/**",
      "playwright-report/**",
      "test-results/**",
      "coverage/**",
      "public/**",
    ],
  },
  {
    rules: {
      // Images come from Vercel Blob or the local uploads folder, and the
      // service worker caches them by URL. next/image would add a proxy hop
      // for no benefit here.
      "@next/next/no-img-element": "off",
      // This rule flags standard, intentional patterns in this codebase:
      // mount-only DOM reads (theme, portal), syncing form state when a modal
      // opens, and object-URL lifecycles for image previews.
      "react-hooks/set-state-in-effect": "off",
    },
  },
];

export default config;
