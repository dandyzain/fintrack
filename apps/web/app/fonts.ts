import localFont from "next/font/local";

/**
 * Plus Jakarta Sans (variable, by Tokotype — an Indonesian foundry).
 * Self-hosted from @fontsource so builds never depend on a font CDN.
 */
export const fontSans = localFont({
  src: [
    {
      path: "../node_modules/@fontsource-variable/plus-jakarta-sans/files/plus-jakarta-sans-latin-wght-normal.woff2",
      weight: "200 800",
      style: "normal",
    },
    {
      path: "../node_modules/@fontsource-variable/plus-jakarta-sans/files/plus-jakarta-sans-latin-ext-wght-normal.woff2",
      weight: "200 800",
      style: "normal",
    },
  ],
  variable: "--font-sans",
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
});
