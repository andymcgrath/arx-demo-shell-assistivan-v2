/**
 * BRANDING CONFIGURATION
 *
 * There are two distinct branding layers:
 *
 *   MANUFACTURER — displayed only in the Header and Footer
 *                  (platform name, logo, tagline, support, legal)
 *
 *   PROGRAM      — displayed throughout the workflow pages
 *                  (drug name, drug logo, description, brand colors)
 *
 * To rebrand say "rebrand [Program Name]" and the assistant will prompt
 * you for all the info below and update this file + global.css automatically.
 *
 * Logo variants:
 *   colors — transparent background, brand-colored (use on white/light bg)
 *   white  — transparent background, all white    (use on teal/dark bg)
 */

export const MANUFACTURER = {
  name: "CoAssist",
  tagline: "Patient assistance & medication access program",
  logo: {
    colors: "https://assistrxcoassist.my.site.com/sfsites/c/cms/delivery/media/MCWTFQTGIVD5A3XFI6PW6BBNPJOA?version=1.1&channelId=0apUP00000004A5",
    requiresFilter: true,
    white: "https://cdn.builder.io/api/v1/image/assets%2F4c828a6b97e546bc967a796675ca457e%2Fd4102262e0444fd382b915ea166760c5",
  },
  support: {
    label: "Technical Help",
    phone: "877-450-4412",
  },
  legal: {
    privacyUrl: "#",
    termsUrl: "#",
    safetyUrl: "#",
    prescribingUrl: "#",
  },
  copyright: `©${new Date().getFullYear()} AssistRx. All Rights Reserved. Intended for US residents only.`,
};

export const PROGRAM = {
  name: "Assistivan",
  drugDisplayName: "Assistivan",
  description: "0.8 mg · 30-day supply",
  logo: {
    // Transparent background, brand-colored — use on white/light backgrounds
    colors: "https://cdn.builder.io/api/v1/image/assets%2F4c828a6b97e546bc967a796675ca457e%2Ffa54f2bf868e40c1a1aa8351cb5b8cd4",
    // Transparent background, all white — use on teal/dark backgrounds
    white: "https://cdn.builder.io/api/v1/image/assets%2F4c828a6b97e546bc967a796675ca457e%2Fd4102262e0444fd382b915ea166760c5",
  },
  colors: {
    // Applied to --arx-primary, --arx-primary-dark, --arx-primary-80 in global.css
    primary: "#007178",
    primaryDark: "#005a5f",
    primaryLight: "#338D93",
  },
};

export const CHATBOT_ICON = "https://cdn.builder.io/api/v1/image/assets%2F4c828a6b97e546bc967a796675ca457e%2Fcd6e286159a142f4ba939dc20997b2da";
