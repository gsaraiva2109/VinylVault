import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "./common/**/*.{ts,tsx}",
    "*.{js,ts,jsx,tsx,mdx}",
  ],
  prefix: "",
  theme: {
    fontSize: {
      "2xs": ["11px", { lineHeight: "1.3", letterSpacing: "-0.3px", fontWeight: "300" }],
      xs: ["0.75rem", { lineHeight: "1rem", letterSpacing: "-0.36px", fontWeight: "300" }],
      sm: ["0.875rem", { lineHeight: "1.25rem", letterSpacing: "-0.42px" }],
      base: ["1rem", { lineHeight: "1.6", letterSpacing: "-0.48px" }],
      lg: ["1.125rem", { lineHeight: "1.75rem", letterSpacing: "-0.72px" }],
      xl: ["1.25rem", { lineHeight: "1.75rem", letterSpacing: "-0.8px" }],
      "2xl": ["1.5rem", { lineHeight: "2rem", letterSpacing: "-1.04px" }],
      "3xl": ["2rem", { lineHeight: "2.25rem", letterSpacing: "-1.2px" }],
      "4xl": ["2.25rem", { lineHeight: "2.5rem", letterSpacing: "-1.44px" }],
      "5xl": ["3rem", { letterSpacing: "-1.6px" }],
      "6xl": ["3.75rem", { letterSpacing: "-1.8px" }],
      "7xl": ["4.5rem", { letterSpacing: "-2px" }],
      "8xl": ["6rem", { letterSpacing: "-2.4px" }],
      "9xl": ["8rem", { letterSpacing: "-3.2px" }],
    },
    extend: {
      container: {
        center: true,
        padding: "2rem",
        screens: {
          "2xl": "1400px",
        },
      },
      fontFamily: {
        sans: ["Geist", "sans-serif"],
        serif: ["IBM Plex Serif", "serif"],
      },
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
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      letterSpacing: {
        tighter: "-0.58px",
        tight: "-0.48px",
      },
      typography: {
        DEFAULT: {
          css: {
            p: {
              letterSpacing: "-0.48px",
            },
            code: {
              letterSpacing: "normal",
            },
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    require("@tailwindcss/typography"),
    require("tailwindcss-radix"),
  ],
} satisfies Config;

export default config;
