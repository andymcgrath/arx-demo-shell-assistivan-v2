import type { ScreenMap } from "@/engine/workflow/screens";
import { IASSIST_FORKS } from "./forks";
import { IA_MEDICAL_TRANSFER, IA_PA_APPROVED, IA_PA_DENIED_APPEAL, IASSIST_FLOWS } from "./scenarios";
import { APPEAL_ROUTES, APPEAL_SCREENS } from "./modules/screens/appeal";
import { ENROLLMENT_ROUTES, ENROLLMENT_SCREENS } from "./modules/screens/enrollment";
import { PA_NOTIFICATION_ROUTES, PA_NOTIFICATION_SCREENS } from "./modules/screens/pa_notification";
import { PHARMACY_SELECTION_ROUTES, PHARMACY_SELECTION_SCREENS } from "./modules/screens/pharmacy_selection";
import { PAYMENT_ROUTES, PAYMENT_SCREENS } from "./modules/screens/payment";
import { SCHEDULING_ROUTES, SCHEDULING_SCREENS } from "./modules/screens/scheduling";
import { SPINE_ROUTES, SPINE_SCREENS } from "./modules/screens/spine";
import { TRACKING_ROUTES, TRACKING_SCREENS } from "./modules/screens/tracking";
import { IASSIST_GROUPS, IASSIST_SLOTS } from "./modules/slots";

/**
 * iAssist patient screens, assembled from the modules. See workflows/coassist/screens.ts for how the pieces work.
 *
 * iAssist_PA_Approved: onboarding, PA approved SMS and OTP, pricing, delivery, tracking.
 * iAssist_PAP (appeal): onboarding, PA denied, then the appeal result and the infusion date.
 * The appeal flow never reaches the pricing screens.
 *
 * Module order here sets the order of screens inside a menu group: pa_notification, then the spine's PA denial,
 * then the appeal (the PA group), and scheduling, then payment, then tracking (the order group).
 */
export const IASSIST_SCREENS: ScreenMap = {
  flows: IASSIST_FLOWS,
  fallback: "/lock-screen",
  hidden: ["/lock-screen"],
  slots: IASSIST_SLOTS,
  groups: IASSIST_GROUPS,
  scenarioDefs: [IA_PA_APPROVED, IA_PA_DENIED_APPEAL, IA_MEDICAL_TRANSFER],
  forks: IASSIST_FORKS,

  screens: [
    ...ENROLLMENT_SCREENS,
    ...PA_NOTIFICATION_SCREENS,
    ...SPINE_SCREENS,
    ...APPEAL_SCREENS,
    ...PHARMACY_SELECTION_SCREENS,
    ...SCHEDULING_SCREENS,
    ...PAYMENT_SCREENS,
    ...TRACKING_SCREENS,
  ],

  rules: [
    ...ENROLLMENT_ROUTES,
    ...APPEAL_ROUTES,
    ...SPINE_ROUTES,
    ...PA_NOTIFICATION_ROUTES,
    ...PHARMACY_SELECTION_ROUTES,
    ...PAYMENT_ROUTES,
    ...SCHEDULING_ROUTES,
    ...TRACKING_ROUTES,
  ],
};
