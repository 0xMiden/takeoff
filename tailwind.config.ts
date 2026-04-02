import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
        },
        border: "var(--glass-border)",
        card: "var(--glass)",
      },
      borderRadius: {
        DEFAULT: "var(--radius)",
        sm: "var(--radius-sm)",
      },
      keyframes: {
        fadeInGlass: {
          from: { opacity: "0", backdropFilter: "blur(0)" },
          to: { opacity: "1", backdropFilter: "blur(var(--glass-blur))" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 8px rgba(74, 222, 128, 0.1)" },
          "50%": { boxShadow: "0 0 16px rgba(74, 222, 128, 0.3)" },
        },
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
      },
      animation: {
        "fade-in-glass": "fadeInGlass 0.3s ease-out",
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
        blink: "blink 1s step-end infinite",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
} satisfies Config;
