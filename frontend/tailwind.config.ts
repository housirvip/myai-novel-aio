import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar))",
          foreground: "hsl(var(--sidebar-foreground))",
          border: "hsl(var(--sidebar-border))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
        },
      },
      borderRadius: {
        xl: "0.75rem",
        lg: "0.5rem",
        md: "0.375rem",
        sm: "0.25rem",
      },
      boxShadow: {
        glow: "0 8px 32px hsl(var(--primary) / 0.12)",
        "glow-lg": "0 12px 48px hsl(var(--primary) / 0.18)",
        "glow-sm": "0 2px 12px hsl(var(--primary) / 0.08)",
        "glow-accent": "0 8px 32px hsl(var(--accent) / 0.15)",
        soft: "0 1px 8px hsl(var(--foreground) / 0.04)",
        "card-hover": "0 8px 24px hsl(var(--foreground) / 0.08)",
        "elevation-1": "0 1px 3px hsl(var(--foreground) / 0.04), 0 1px 2px hsl(var(--foreground) / 0.06)",
        "elevation-2": "0 4px 12px hsl(var(--foreground) / 0.06), 0 2px 4px hsl(var(--foreground) / 0.04)",
        "elevation-3": "0 12px 36px hsl(var(--foreground) / 0.1), 0 4px 12px hsl(var(--foreground) / 0.06)",
        "input-focus": "0 0 0 3px hsl(var(--primary) / 0.1)",
      },
      backgroundImage: {
        "gradient-brand":
          "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.7) 50%, hsl(var(--accent) / 0.8) 100%)",
        "gradient-header":
          "linear-gradient(135deg, hsl(var(--primary) / 0.9), hsl(var(--primary) / 0.6))",
        "gradient-subtle":
          "linear-gradient(135deg, hsl(var(--primary) / 0.04) 0%, hsl(var(--accent) / 0.03) 100%)",
        "gradient-mesh":
          "radial-gradient(at 40% 20%, hsl(var(--primary) / 0.08) 0px, transparent 50%), radial-gradient(at 80% 0%, hsl(var(--accent) / 0.06) 0px, transparent 50%), radial-gradient(at 0% 50%, hsl(var(--primary) / 0.04) 0px, transparent 50%)",
      },
      transitionTimingFunction: {
        "out-expo": "cubic-bezier(0.19, 1, 0.22, 1)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.4s cubic-bezier(0.19, 1, 0.22, 1)",
        "fade-in": "fade-in 0.3s ease-out",
        "scale-in": "scale-in 0.3s cubic-bezier(0.19, 1, 0.22, 1)",
      },
      fontFamily: {
        sans: [
          '"Inter"',
          '"Noto Sans SC"',
          '"PingFang SC"',
          '"Microsoft YaHei"',
          "system-ui",
          "sans-serif",
        ],
        serif: [
          '"Source Han Serif SC"',
          '"Songti SC"',
          '"STSong"',
          "serif",
        ],
        mono: [
          '"JetBrains Mono"',
          '"Fira Code"',
          "monospace",
        ],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
