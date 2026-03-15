import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

const config: Config = {
  content: [
    "./index.html",
    "./**/*.{ts,tsx}",
    "!./functions/**",
    "!./dist/**",
    "!./node_modules/**",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#00FF94",
          dark: "#00cc76",
          light: "#33FFB0",
        },
        primaryDark: "#00cc76",
        background: {
          DEFAULT: "#0a0a0f",
          surface: "#12121a",
          elevated: "#1a1a28",
        },
        surface: "#12121a",
        border: {
          DEFAULT: "#1E1E2A",
          light: "#2a2a3a",
        },
      },
      fontFamily: {
        sans: ['"SF Pro Display"', '"Helvetica Neue"', "Arial", "sans-serif"],
        display: ["Oswald", "sans-serif"],
        mono: ['"SF Mono"', '"Fira Code"', "monospace"],
      },
      animation: {
        fadeIn: "fadeIn 0.3s ease-in-out",
        slideUp: "slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(16px) scale(0.98)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
      },
      borderRadius: {
        "4xl": "2rem",
      },
    },
  },
  plugins: [typography],
};

export default config;
