import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f8f1fd", 100: "#f0e1fb", 200: "#e1c3f6", 300: "#cc9bee", 400: "#b46fe4",
          500: "#a247e6", 600: "#8a32c9", 700: "#7125a3", 800: "#5c1f84", 900: "#481a66",
        },
        // text colours (all pass WCAG AA on white / #faf7fc)
        ink: { DEFAULT: "#1c1626", soft: "#4a4256", mute: "#6b6377" },
      },
      boxShadow: { card: "0 1px 2px rgba(28, 22, 38, 0.04), 0 8px 24px -12px rgba(113, 37, 163, 0.18)" },
    },
  },
  plugins: [],
};
export default config;
