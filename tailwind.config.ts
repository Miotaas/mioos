import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // MioOS color palette
        void: "#050508",
        surface: {
          DEFAULT: "#0d0d14",
          1: "#12121c",
          2: "#18182a",
          3: "#1e1e32",
          4: "#242440",
        },
        border: {
          DEFAULT: "#ffffff10",
          bright: "#ffffff20",
          glow: "#6366f140",
        },
        accent: {
          purple: "#6366f1",
          violet: "#8b5cf6",
          blue: "#3b82f6",
          cyan: "#06b6d4",
          green: "#10b981",
          amber: "#f59e0b",
          red: "#ef4444",
          pink: "#ec4899",
        },
        text: {
          primary: "#f1f5f9",
          secondary: "#94a3b8",
          muted: "#475569",
          ghost: "#334155",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "grid-pattern":
          "linear-gradient(rgba(99,102,241,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.03) 1px, transparent 1px)",
      },
      backgroundSize: {
        grid: "32px 32px",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "float": "float 6s ease-in-out infinite",
        "glow": "glow 2s ease-in-out infinite alternate",
        "slide-in": "slideIn 0.3s ease-out",
        "fade-in": "fadeIn 0.2s ease-out",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" },
        },
        glow: {
          "0%": { boxShadow: "0 0 5px rgba(99,102,241,0.3)" },
          "100%": { boxShadow: "0 0 20px rgba(99,102,241,0.6), 0 0 40px rgba(99,102,241,0.2)" },
        },
        slideIn: {
          "0%": { transform: "translateX(100%)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      boxShadow: {
        glow: "0 0 15px rgba(99,102,241,0.3)",
        "glow-lg": "0 0 30px rgba(99,102,241,0.4)",
        "glow-green": "0 0 15px rgba(16,185,129,0.3)",
        "inner-glow": "inset 0 1px 0 rgba(255,255,255,0.05)",
        card: "0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)",
      },
    },
  },
  plugins: [],
};

export default config;
