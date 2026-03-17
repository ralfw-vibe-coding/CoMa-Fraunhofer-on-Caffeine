import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#120b08",
        foreground: "#fff8f0",
        border: "#4b3a31",
        input: "#4b3a31",
        ring: "#8b7cff",
        card: "#2a1a13",
        "card-foreground": "#fff8f0",
        primary: {
          DEFAULT: "#8b7cff",
          foreground: "#ffffff",
        },
        secondary: {
          DEFAULT: "#fff0a8",
          foreground: "#3d3212",
        },
        muted: {
          DEFAULT: "#2f1e17",
          foreground: "#d8c8bd",
        },
      },
      borderRadius: {
        lg: "1rem",
        md: "0.85rem",
        sm: "0.65rem",
      },
      boxShadow: {
        card: "0 20px 46px rgba(0, 0, 0, 0.5)",
      },
      fontFamily: {
        sans: ["Arial", "Helvetica", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
