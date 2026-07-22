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
    colors: "/branding/boehringer-logo-colors.png",
    requiresFilter: false,
    white: "/branding/boehringer-logo-white.png",
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
  description: "18 mg · nerandomilast tablets",
  logo: {
    // Transparent background, brand-colored — use on white/light backgrounds
    colors: "/branding/jascayd-logo-colors.png",
    // Transparent background, all white — use on teal/dark backgrounds
    white: "/branding/jascayd-logo-white.png",
  },
  colors: {
    // Applied to --arx-primary, --arx-primary-dark, --arx-primary-80 in global.css
    // Source: official JASCAYD / Boehringer Ingelheim brand palette (2023 Interbrand rebrand)
    primary: "#215048", // Forest-mid
    primaryDark: "#08312A", // Forest (hero backgrounds, navbars)
    primaryLight: "#507A76", // Forest-light
  },
};

export const CHATBOT_ICON = "https://cdn.builder.io/api/v1/image/assets%2F4c828a6b97e546bc967a796675ca457e%2Fcd6e286159a142f4ba939dc20997b2da";
