import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./client/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      fontFamily: {
        sans: ["Inter", "-apple-system", "sans-serif"],
        "open-sans": ["Open Sans", "-apple-system", "Roboto", "Helvetica", "sans-serif"],
      },
      colors: {
        /* ── shadcn/ui base tokens (shared, CRM default) ── */
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

        /* ── AssistRx / iAssist patient design system ── */
        "arx-primary": "hsl(var(--arx-primary))",
        "arx-primary-dark": "hsl(var(--arx-primary-dark))",
        "arx-primary-80": "hsl(var(--arx-primary-80))",
        "arx-primary-30": "hsl(var(--arx-primary-30))",
        "arx-secondary": "hsl(var(--arx-secondary))",
        "arx-sky": "hsl(var(--arx-sky))",
        "arx-slate": "hsl(var(--arx-slate))",
        "arx-body-copy": "hsl(var(--arx-body-copy))",
        "arx-neutral-800": "hsl(var(--arx-neutral-800))",
        "arx-neutral-100": "hsl(var(--arx-neutral-100))",
        "arx-neutral-000": "hsl(var(--arx-neutral-000))",
        "arx-errors": "hsl(var(--arx-errors))",
        "arx-orange": "hsl(var(--arx-orange))",
        "arx-links": "hsl(var(--arx-links))",
        "arx-optional": "hsl(var(--arx-optional))",
        "arx-inactive": "hsl(var(--arx-inactive))",
        "arx-borders": "hsl(var(--arx-borders))",
        "arx-background": "hsl(var(--arx-background))",

        /* Legacy patient portal aliases */
        "keppel": "#338D93",
        "slate": "#414042",
        "body-copy": "#6F7276",
        "app-bg": "#F8F8F8",
        "border-light": "#E0E0E0",
        "foundayo-teal": "#007178",
        "foundayo-teal-tint": "#ADE2E3",
        "assistivan-orange": "#EF8A13",

        /* ── Analytics dark navy/teal ── */
        navy: {
          DEFAULT: "hsl(var(--navy))",
          mid: "hsl(var(--navy-mid))",
          light: "hsl(var(--navy-light))",
        },

        /* iAssist dashboard colors */
        teal: {
          500: "#1A7F85",
          600: "#007178",
          700: "#03656B",
          800: "#024249",
          DEFAULT: "#007178",
          dark: "#03656B",
        },
        neutral: {
          100: "#F8F8F8",
          300: "#E8E8E8",
          500: "#999999",
          600: "#6F7276",
          800: "#1D1D1D",
        },
        orange: {
          100: "#FFEADE",
          200: "#FFEADE",
          800: "#D8693A",
        },
        red: {
          100: "#FCE4E4",
          600: "#D02B20",
        },
        amber: {
          100: "#FEF3C7",
        },

        /* ── Shell chrome ── */
        "shell-bg": "#0f172a",
        "shell-tab-active": "#ffffff",
        "shell-tab-inactive": "rgba(255,255,255,0.55)",
        "shell-accent": "#6366f1",

        /* ── Salesforce / CRM ── */
        "sf-blue": "#0070d2",
        "sf-border": "#dddbda",
        "sf-bg": "#f3f3f3",

        /* Status colors for iAssist */
        "status-success": "#035257",
        "status-warning": "#D8693A",
        "status-error": "#D02B20",
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
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
