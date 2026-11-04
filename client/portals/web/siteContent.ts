/**
 * Copy for the client web page's safety summary and footer. Representative text, not real prescribing information.
 * Drug and company names come from the brand through `{drug}` and the brand tokens. None is written here.
 */

export interface SafetyBlock {
  heading?: string;
  /** A plain paragraph. */
  text?: string;
  /** Bulleted list. */
  bullets?: string[];
  /** Bold lead-in plus body, one per item. */
  items?: { lead: string; body: string }[];
}

export const SAFETY_BLOCKS: SafetyBlock[] = [
  {
    heading: "Warnings",
    text: "{drug} may cause tumors in the thyroid, including thyroid cancer. Watch for possible symptoms, such as a lump or swelling in the neck, hoarseness, trouble swallowing, or shortness of breath. Do not use {drug} if you or any of your family have ever had a type of thyroid cancer called medullary thyroid carcinoma (MTC).",
    bullets: [
      "Do not use {drug} if you have Multiple Endocrine Neoplasia syndrome type 2 (MEN 2).",
      "Do not use {drug} if you have a serious allergic reaction to any of its ingredients.",
    ],
  },
  {
    heading: "{drug} may cause serious side effects, including:",
    items: [
      { lead: "Inflammation of the pancreas (pancreatitis).", body: "Stop taking {drug} and call your healthcare provider right away if you have severe pain in your stomach area that will not go away, with or without vomiting." },
      { lead: "Severe stomach problems.", body: "Tell your healthcare provider if you have stomach problems that are severe or will not go away." },
      { lead: "Dehydration leading to kidney problems.", body: "Diarrhea, nausea, and vomiting may cause a loss of fluids. Drink fluids to help reduce your chance of dehydration." },
      { lead: "Low blood sugar (hypoglycemia).", body: "Your risk may be higher if you use {drug} with insulin or a sulfonylurea. Signs include dizziness, sweating, confusion, hunger, weakness, or feeling jittery." },
      { lead: "Serious allergic reactions.", body: "Stop using {drug} and get medical help right away if your face, lips, tongue, or throat swell, or if you have trouble breathing or swallowing." },
      { lead: "Gallbladder problems.", body: "Tell your healthcare provider right away if you have pain in your upper stomach, fever, yellowing of the skin or eyes, or clay-colored stools." },
    ],
  },
  {
    heading: "Common side effects",
    text: "The most common side effects of {drug} include nausea, constipation, diarrhea, vomiting, stomach pain, headache, feeling tired, heartburn, and gas. These are not all the possible side effects. Talk to your healthcare provider about any side effect that bothers you. You can report side effects at 1-800-FDA-1088 or www.fda.gov/medwatch.",
  },
  {
    heading: "Before taking {drug}",
    bullets: [
      "Tell your healthcare provider about all the medicines you take.",
      "Tell your healthcare provider if you are pregnant or plan to become pregnant.",
      "Birth control pills may not work as well while taking {drug}.",
      "Talk to your healthcare provider about low blood sugar and how to manage it.",
    ],
  },
  {
    heading: "How to take {drug}",
    bullets: [
      "Take {drug} exactly as your healthcare provider tells you to.",
      "Use {drug} with a reduced-calorie diet and increased physical activity.",
      "If you miss a dose, ask your healthcare provider what to do.",
    ],
  },
];

export const INDICATION = {
  text: "{drug} is indicated as a prescription medication used with a reduced-calorie diet and increased physical activity to help adults with type 2 diabetes improve blood sugar and keep weight off.",
  bullets: [
    "{drug} should not be used with other GLP-1 receptor agonist medicines.",
    "{drug} has not been studied enough to know if it is effective for use in children.",
  ],
};

export interface FooterGroup {
  title: string;
  /** `{company}` becomes the manufacturer name. */
  links: string[];
}

export const FOOTER_GROUPS: FooterGroup[] = [
  { title: "Conditions", links: ["Alzheimer's disease", "Autoimmune", "Cancer", "Dermatology", "Diabetes", "Migraine", "Obesity", "Sleep apnea"] },
  { title: "Care", links: ["Telehealth", "In-person care", "Health checks", "Well-being library"] },
  { title: "{company}", links: ["Available medicines", "For providers", "How it works", "Pipeline", "Partners"] },
  { title: "Science", links: ["Clinical trials", "Research and development", "Pipeline development"] },
  { title: "Medicines", links: ["Our medicines", "Safety", "Report a product concern", "Disposal", "Access and affordability"] },
  { title: "About us", links: ["Our history", "Leadership", "Careers", "Suppliers", "Contact us"] },
  { title: "For providers", links: ["Provider resources", "Medical information"] },
  { title: "News and stories", links: ["Press releases", "Stories", "Media", "Investors"] },
];

export const LEGAL_LINKS = ["Terms of use", "Privacy statement", "Communication preferences", "Consumer health privacy notice", "Accessibility statement", "Sitemap"];
