/**
 * The pricing options the patient sees on Benefit Pricing, shared with the client web page so both screens read one
 * list. The card that draws them is PricingCard.tsx.
 */
import { Store, Truck, Sparkles } from "lucide-react";
import { PROGRAM } from "@/portals/patient/config/branding";

export type PricingKey = "retail" | "mail_order" | "self_pay";

export interface PricingOption {
  key: PricingKey;
  icon: typeof Store;
  label: string;
  price: number;
  cadence?: string;
  supply?: string;
  pharmacy?: string;
  description?: string;
  cta: string;
  badge?: string;
}

export const PRICING_OPTIONS: PricingOption[] = [
  {
    key: "retail",
    icon: Store,
    label: "Retail Pharmacy",
    price: 50,
    supply: "1.0 mg Dose / 30 days",
    pharmacy: "CVS Pharmacy #3795",
    cta: "Select",
  },
  {
    key: "mail_order",
    icon: Truck,
    label: "Mail Order",
    price: 100,
    supply: "1.0 mg Dose / 90 days",
    pharmacy: "FutureScripts Home Delivery",
    cta: "Select",
  },
  {
    key: "self_pay",
    icon: Sparkles,
    label: `${PROGRAM.drugDisplayName} Copay Program`,
    price: 25,
    cadence: "/month",
    description: `Pay a reduced price by filling through the CoAssist Pharmacy — no separate insurance approval needed for this option.`,
    cta: "Enroll",
    badge: "Best Value",
  },
];

// CoA_Copay only — not yet enrolled. Copay leads (styled as the main CTA in
// CopayBenefitPricing below), followed by Retail/Mail at their normal,
// un-enrolled prices — enrolling is what unlocks the discount below.
export const COPAY_PRE_ENROLL_OPTIONS: PricingOption[] = [
  {
    key: "self_pay",
    icon: Sparkles,
    label: `${PROGRAM.drugDisplayName} Copay Program`,
    price: 25,
    cadence: "/month",
    description: `As low as $25/month — enroll, then pick Retail or Mail Order for pickup or delivery at the discounted rate. No separate insurance approval needed.`,
    cta: "Enroll",
    badge: "Best Value",
  },
  {
    key: "retail",
    icon: Store,
    label: "Retail Pharmacy",
    price: 50,
    supply: "1.0 mg Dose / 30 days",
    pharmacy: "CVS Pharmacy #3795",
    cta: "Select",
  },
  {
    key: "mail_order",
    icon: Truck,
    label: "Mail Order",
    price: 100,
    supply: "1.0 mg Dose / 90 days",
    pharmacy: "FutureScripts Home Delivery",
    cta: "Select",
  },
];

// CoA_Copay only — already enrolled (copayEnrolled true, pricingOption still
// null). Copay's card is gone (already chosen); Retail/Mail now show the
// discounted Copay rate instead of their normal price, since that's the
// whole point of having enrolled.
export const COPAY_POST_ENROLL_OPTIONS: PricingOption[] = [
  {
    key: "retail",
    icon: Store,
    label: "Retail Pharmacy",
    price: 25,
    cadence: "/month",
    supply: "1.0 mg Dose / 30 days",
    pharmacy: "CVS Pharmacy #3795",
    cta: "Select",
  },
  {
    key: "mail_order",
    icon: Truck,
    label: "Mail Order",
    price: 50,
    cadence: "/month",
    supply: "1.0 mg Dose / 90 days",
    pharmacy: "FutureScripts Home Delivery",
    cta: "Select",
  },
];

