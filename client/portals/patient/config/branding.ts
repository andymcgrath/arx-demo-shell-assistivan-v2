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
  name: "Boehringer Ingelheim",
  tagline: "Patient assistance & medication access program",
  logo: {
    colors: "https://cdn.builder.io/api/v1/image/assets%2F4c828a6b97e546bc967a796675ca457e%2Fc247a0ae707a47099e0b22c5536915bd",
    requiresFilter: true,
    white: "https://cdn.builder.io/api/v1/image/assets%2F4c828a6b97e546bc967a796675ca457e%2Fbc31c9697b2a49dfb0c47fd5127c6435",
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
  name: "Jascayd",
  drugDisplayName: "Jascayd",
  description: "9 mg · 18 mg tablets",
  logo: {
    // Transparent background, brand-colored — use on white/light backgrounds
    colors: "https://cdn.builder.io/api/v1/image/assets%2F4c828a6b97e546bc967a796675ca457e%2F097a28baebb84d83a013b3d2c73a6e77",
    // Transparent background, all white — use on teal/dark backgrounds
    white: "https://cdn.builder.io/api/v1/image/assets%2F4c828a6b97e546bc967a796675ca457e%2Fd29046caf29c459a83dce15ccb37bf3a",
  },
  colors: {
    // Applied to --arx-primary, --arx-primary-dark, --arx-primary-80 in global.css
    primary: "#205048",
    primaryDark: "#0d3835",
    primaryLight: "#3a6f68",
  },
};

export const CHATBOT_ICON = "https://cdn.builder.io/api/v1/image/assets%2F4c828a6b97e546bc967a796675ca457e%2Fcd6e286159a142f4ba939dc20997b2da";
