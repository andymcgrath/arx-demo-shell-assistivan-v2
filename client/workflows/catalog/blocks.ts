import type { ModuleId } from "@/engine/workflow/components";
import type { CatalogBlock, CatalogStep } from "./types";

const step = (label: string, lane: CatalogStep["lane"], trigger: CatalogStep["trigger"]): CatalogStep => ({ label, lane, trigger });

/** The patient's side of onboarding, the same after every kind of referral. */
const PATIENT_ONBOARDING = [step("Patient taps the text", "patient", "text"), step("Patient enters the one-time code", "patient", "text"), step("Patient consents", "patient", "click")];

/**
 * One entry per block (step module). Names are sales vocabulary. The module id is the `id` field.
 * Draft each summary from the module's rules and screens, and say only what they do today.
 * An entry with `draft: true` has a `question` for the user and fails the tag step until it is cleared.
 *
 * Lane and trigger are the block's usual shape. A variant overrides them when it differs.
 */
export const CATALOG_BLOCKS: Record<ModuleId, CatalogBlock> = {
  enrollment: {
    id: "enrollment",
    name: "Patient onboarding",
    summary: "The patient gets a text, enters a one-time code, and consents. Benefits checking starts from the referral and does not wait for them.",
    aliases: ["onboarding", "enrollment", "enroll", "SMS and OTP", "consent", "patient verification"],
    apps: ["crm", "patient", "iassist"],
    lane: "patient",
    trigger: "text",
    variants: [
      {
        id: "default",
        label: "Patient onboarding",
        summary: "The HCP submits the referral. The patient gets a text, enters a one-time code, and consents.",
        steps: [step("HCP submits the referral", "hcp", "click"), ...PATIENT_ONBOARDING],
      },
      {
        id: "web",
        label: "Starts on the client's web page",
        summary: "The page already collected consent and details, so there is no text, code, or consent step. The patient submits the Rx details, the presenter opens the Gateway tab, and the patient taps Check Pricing on the coverage summary.",
        apps: ["web", "gateway", "patient"],
        lane: "patient",
        trigger: "click",
        steps: [
          step("Patient finishes the Rx screen on the client's page", "patient", "click"),
          step("Presenter opens the Gateway tab, and the benefit check and PA run", "system", "view"),
          step("Patient taps Check Pricing on the coverage summary", "patient", "click"),
        ],
      },
      {
        id: "no_rx",
        label: "Referral with no Rx",
        summary: "The HCP submits the enrollment with no prescription (the HCP orders the drug from their own wholesaler). The patient's text, code, and consent follow.",
        lane: "hcp",
        apps: ["iassist", "crm", "patient"],
        steps: [step("HCP submits the enrollment with no Rx", "hcp", "click"), ...PATIENT_ONBOARDING],
      },
    ],
  },
  benefit_verification: {
    id: "benefit_verification",
    name: "Medical benefit check by the HCP (eMedBV)",
    summary: "The HCP runs a medical benefit check in iAssist before submitting the enrollment, and sees the result on the Insurance step.",
    aliases: ["eMedBV", "medical BV", "benefit verification"],
    apps: ["iassist"],
    lane: "hcp",
    trigger: "click",
    // Only the medical benefit is built. The `benefit` prop has no other value.
  },
  copay: {
    id: "copay",
    name: "Copay enrollment by the HCP",
    summary: "The HCP enrolls the patient in the copay program in iAssist and gets the copay card. The patient does nothing. The CRM shows a Copay tab.",
    aliases: ["copay card", "copay program", "copay enrollment", "copay"],
    apps: ["iassist", "crm"],
    lane: "hcp",
    trigger: "click",
  },
  copay_claim: {
    id: "copay_claim",
    name: "Copay claim",
    summary: "After the PA is approved, the HCP files a claim for the administered dose from the patient record. The new claim shows as in review.",
    aliases: ["copay claim", "claim", "file a claim"],
    apps: ["iassist"],
    lane: "hcp",
    trigger: "click",
  },
  patient_record: {
    id: "patient_record",
    name: "Patient record in iAssist",
    summary: "The HCP sees the patient's status cards, history, and documents. The free drug version adds the application and appointment cards.",
    aliases: ["patient record", "patient status", "patient history", "HCP view"],
    apps: ["iassist"],
    lane: "hcp",
    trigger: "view",
  },
  pa_notification: {
    id: "pa_notification",
    name: "Prior authorization result text",
    summary: "The patient taps the text that says the PA was decided and enters a one-time code.",
    aliases: ["APA result", "PA approved text", "PA text", "PA notification", "prior auth result"],
    apps: ["patient", "crm"],
    lane: "patient",
    trigger: "text",
    steps: [step("Patient taps the text", "patient", "text"), step("Patient enters the one-time code", "patient", "text")],
    variants: [
      { id: "default", label: "Prior authorization result text", summary: "The patient taps the text that says the PA was decided and enters a one-time code." },
      {
        id: "hcp_administered",
        label: "HCP administered",
        summary: "After the text and code, the final screen tells the patient to contact their prescriber and that they will hear about next steps.",
        steps: [step("Patient taps the text", "patient", "text"), step("Patient enters the one-time code", "patient", "text"), step("Patient sees the final screen", "patient", "view")],
      },
      {
        // Checked in web_handoff.ts: CHECK_PRICING marks the text and code verified, and the SMS screen excludes this variant.
        id: "web",
        label: "Shown on the client's web page",
        summary: "No text or code. The patient sees the approval on the coverage summary page, and Check Pricing moves on.",
        apps: ["web", "patient"],
        trigger: "view",
        steps: [step("Patient sees the approval on the coverage summary", "patient", "view")],
      },
    ],
  },
  cash_offer: {
    id: "cash_offer",
    name: "Cash offer",
    summary: "The patient gets an offer to pay cash through the manufacturer's own pharmacy.",
    aliases: ["cash price", "self-pay offer", "cash pay", "DTP offer", "direct to patient"],
    apps: ["crm", "patient"],
    lane: "patient",
    trigger: "text",
    variants: [
      { id: "pa_denied", label: "After a denied PA", summary: "The PA is denied, the agent sends the cash offer from the CRM, and the patient sees it.", trigger: "click" },
      { id: "sms", label: "No coverage, offered by text", summary: "Neither benefit covers it, so a text offers cash pay. The patient opens it and accepts." },
    ],
  },
  financial_assistance: {
    id: "financial_assistance",
    name: "Financial assistance",
    summary: "The patient gets help paying: a reduced copay price, or a free drug application.",
    aliases: ["PAP", "free drug", "patient assistance", "copay savings", "financial assistance"],
    apps: ["patient", "crm"],
    lane: "patient",
    trigger: "text",
    variants: [
      {
        id: "copay",
        label: "Copay savings",
        summary: "The patient enrolls for the reduced price, then picks Retail or Mail Order.",
        trigger: "click",
        steps: [step("Patient enrolls in the copay program", "patient", "click")],
      },
      {
        id: "pap",
        label: "Free drug application",
        summary: "An update text, then a credit check and household income. The application is received and waits for a CRM agent to approve. The patient pays nothing and sees no pricing.",
        apps: ["patient", "crm", "iassist"],
        steps: [
          step("The application update text goes out after the benefit check", "system", "automatic"),
          step("Patient taps the update text and enters the code", "patient", "text"),
          step("Patient agrees to the credit check and confirms household income", "patient", "click"),
          step("Agent approves the application in the CRM", "agent", "click"),
          step("Patient taps the approval text and enters the code", "patient", "text"),
        ],
      },
    ],
  },
  provider_transfer: {
    id: "provider_transfer",
    name: "Transfer to an outside provider",
    summary: "The medical benefit covers it, so the CRM notifies an outside provider and the patient confirms the transfer by text.",
    aliases: ["provider transfer", "provider handoff", "medical transfer", "outside provider"],
    apps: ["crm", "patient"],
    lane: "patient",
    trigger: "text",
  },
  pap_transfer: {
    id: "pap_transfer",
    name: "Referral to the patient support program",
    summary: "No coverage was found, so the case goes to the manufacturer's patient support program and the patient gets a text.",
    aliases: ["PSP referral", "PAP transfer", "hub transfer", "patient support program"],
    apps: ["crm", "patient"],
    lane: "system",
    trigger: "automatic",
  },
  income_qualification: {
    id: "income_qualification",
    name: "Free drug application (income)",
    summary: "The patient confirms the application update by text and code, then confirms household size and income.",
    aliases: ["PAP application", "income check", "household income", "income qualification"],
    apps: ["patient", "crm"],
    lane: "patient",
    trigger: "text",
  },
  pharmacy_selection: {
    id: "pharmacy_selection",
    name: "Pharmacy selection",
    summary: "The Rx goes to a pharmacy. Who picks it depends on the variant.",
    aliases: ["triage to SP", "triage", "pharmacy", "pharmacy pick", "specialty pharmacy"],
    apps: ["crm", "patient"],
    lane: "agent",
    trigger: "click",
    variants: [
      {
        id: "store",
        label: "Patient picks a retail store",
        summary: "The patient picks a store from the list.",
        lane: "patient",
        steps: [step("Patient picks a retail store", "patient", "click")],
      },
      { id: "network", label: "Patient taps a network pharmacy", summary: "One tap on the network pharmacy.", lane: "patient", steps: [step("Patient taps the network pharmacy", "patient", "click")] },
      { id: "crm", label: "Agent can change the pharmacy", summary: "Once a price is chosen, the agent can change the dispensing pharmacy in the CRM.", steps: [step("Agent changes the dispensing pharmacy in the CRM", "agent", "click")] },
      {
        id: "site_of_care",
        label: "Agent sends it to the site of care",
        summary: "The agent triages the Rx to the site of care after the appeal or approval unlocks it.",
        steps: [step("Agent triages the Rx to the site of care", "agent", "click"), step("Free drug only: the dispensing pharmacy starts the order a moment later", "system", "automatic")],
      },
      {
        id: "assigned",
        label: "Assigned pharmacy",
        summary: "Nobody picks. The benefits check assigns a pharmacy and the patient sees its contact details.",
        lane: "system",
        trigger: "automatic",
        apps: ["patient"],
        steps: [step("The benefits check assigns the pharmacy, and the patient sees its contact details", "system", "automatic")],
      },
    ],
  },
  scheduling: {
    id: "scheduling",
    name: "Delivery or appointment date",
    summary: "The patient sets a date.",
    aliases: ["ship date", "delivery address", "appointment", "infusion date", "scheduling"],
    apps: ["patient"],
    lane: "patient",
    trigger: "click",
    variants: [
      { id: "default", label: "Address and ship date", summary: "The patient enters a delivery address and picks a ship date. This is CoAssist, which sets no variant." },
      { id: "delivery", label: "Address and ship date", summary: "The patient enters a delivery address and picks a ship date." },
      { id: "infusion", label: "Infusion appointment date", summary: "The patient picks an appointment date, then gets a text confirmation. It follows an approval or an appeal." },
    ],
  },
  payment: {
    id: "payment",
    name: "Pricing and payment",
    summary: "The patient picks Retail, Mail Order, or self-pay. Self-pay takes a card payment, then the CRM verifies it. Nothing is charged.",
    aliases: ["pricing", "pricing options", "self-pay", "cash payment", "checkout", "payment"],
    apps: ["patient", "crm"],
    lane: "patient",
    trigger: "click",
  },
  appeal: {
    id: "appeal",
    name: "Appeal after a denied PA",
    summary: "A denied PA stays denied. An appeal starts from a rule built in the Rules app, and approving it in the CRM unlocks fulfillment.",
    aliases: ["appeal", "PA denial appeal", "denied PA"],
    apps: ["rules", "crm"],
    lane: "system",
    trigger: "automatic",
    steps: [
      step("A rule built in the Rules app files the appeal after the denial", "system", "automatic"),
      step("Agent opens the Appeal stage in the CRM, and the approval lands a moment later", "agent", "click"),
    ],
  },
  tracking: {
    id: "tracking",
    name: "Order tracking",
    summary: "The pharmacy fills the order, the agent marks it received, shipped, and delivered, and the patient's tracker and the Field app follow each step.",
    aliases: ["tracker", "order tracking", "fulfillment", "shipping", "delivery tracking"],
    apps: ["crm", "field", "patient"],
    lane: "agent",
    trigger: "click",
    steps: [
      step("The pharmacy starts the order", "agent", "click"),
      step("Agent marks it ready", "agent", "click"),
      step("Agent marks it shipped", "agent", "click"),
      step("Agent marks it delivered", "agent", "click"),
    ],
  },
};
