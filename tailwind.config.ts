import type { Config } from "tailwindcss";

// Identidade clara "executiva" (referência .llm/crm.png): fundo creme, cards brancos,
// botões pretos, acento verde-limão. Vermelho reservado para sinais de atraso/erro.
const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#F6F4EF", // creme da página
        surface: "#FFFFFF", // cards/sidebar
        border: "#E7E3DB", // bordas suaves
        input: "#E7E3DB",
        ring: "#18181B",
        primary: {
          DEFAULT: "#18181B", // botões pretos
          foreground: "#FAFAFA",
        },
        accent: {
          DEFAULT: "#4D7C0F", // lime-700: links / texto positivo (legível)
          foreground: "#1A1A1A",
        },
        lime: "#A3E635", // destaque vivo: gauges, barras, realces
        limeSoft: "#ECFCCB",
        foreground: "#1A1A1A",
        muted: {
          DEFAULT: "#F1EEE8",
          foreground: "#6B7280",
        },
        // sinais comerciais
        danger: "#DC2626",
        success: "#16A34A",
        warning: "#CA8A04",
      },
      borderRadius: {
        card: "16px",
        pill: "9999px",
      },
      fontWeight: {
        heavy: "800",
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,16,16,0.04), 0 1px 3px rgba(16,16,16,0.06)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
