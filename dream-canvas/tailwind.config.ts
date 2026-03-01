import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        display: ["Quicksand", "sans-serif"],
        body: ["Nunito", "sans-serif"],
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
        lavender: {
          DEFAULT: "hsl(var(--lavender))",
          soft: "hsl(var(--lavender-soft))",
        },
        peach: {
          DEFAULT: "hsl(var(--peach))",
          deep: "hsl(var(--peach-deep))",
        },
        mint: {
          DEFAULT: "hsl(var(--mint))",
          soft: "hsl(var(--mint-soft))",
        },
        rose: "hsl(var(--rose))",
        cream: "hsl(var(--cream))",
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
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "menu-slide": {
          "0%": { opacity: "0", transform: "translateY(-12px) scale(0.97)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "menu-item-in": {
          "0%": { opacity: "0", transform: "translateX(-8px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "nav-pill-pop": {
          "0%": { transform: "scale(0.96)" },
          "50%": { transform: "scale(1.02)" },
          "100%": { transform: "scale(1)" },
        },
        "logo-sparkle": {
          "0%, 100%": { transform: "scale(1) rotate(0deg)", opacity: "1" },
          "50%": { transform: "scale(1.08) rotate(5deg)", opacity: "0.9" },
        },
        "tab-content-in": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "dropdown-spring": {
          "0%": { opacity: "0", transform: "scale(0.92) translateY(-4px)" },
          "70%": { transform: "scale(1.02) translateY(0)" },
          "100%": { opacity: "1", transform: "scale(1) translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        float: "float 3s ease-in-out infinite",
        "fade-up": "fade-up 0.6s ease-out",
        shimmer: "shimmer 2s ease-in-out infinite",
        "menu-slide": "menu-slide 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "menu-item-in": "menu-item-in 0.4s cubic-bezier(0.34, 1.2, 0.64, 1)",
        "nav-pill-pop": "nav-pill-pop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "logo-sparkle": "logo-sparkle 0.6s ease-out",
        "tab-content-in": "tab-content-in 0.3s cubic-bezier(0.22, 1, 0.36, 1)",
        "dropdown-spring": "dropdown-spring 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
      animationDelay: {
        "stagger-1": "0.05s",
        "stagger-2": "0.1s",
        "stagger-3": "0.15s",
        "stagger-4": "0.2s",
        "stagger-5": "0.25s",
        "stagger-6": "0.3s",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
