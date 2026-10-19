import type { ScreenMap } from "@/engine/workflow/screens";
import { COASSIST_FORKS } from "./forks";
import { COA_COPAY, COA_DME, COA_DTP, COASSIST_FLOWS } from "./scenarios";
import { CASH_OFFER_ROUTES, CASH_OFFER_SCREENS } from "./modules/screens/cash_offer";
import { ENROLLMENT_ROUTES, ENROLLMENT_SCREENS } from "./modules/screens/enrollment";
import { PA_NOTIFICATION_ROUTES, PA_NOTIFICATION_SCREENS } from "./modules/screens/pa_notification";
import { PAYMENT_ROUTES, PAYMENT_SCREENS } from "./modules/screens/payment";
import { PHARMACY_SELECTION_ROUTES, PHARMACY_SELECTION_SCREENS } from "./modules/screens/pharmacy_selection";
import { PROVIDER_TRANSFER_ROUTES, PROVIDER_TRANSFER_SCREENS } from "./modules/screens/provider_transfer";
import { SCHEDULING_ROUTES, SCHEDULING_SCREENS } from "./modules/screens/scheduling";
import { TRACKING_ROUTES, TRACKING_SCREENS } from "./modules/screens/tracking";
import { COASSIST_GROUPS, COASSIST_SLOTS } from "./modules/slots";

/**
 * CoAssist patient screens: assembled from the modules. Each module file in `modules/screens/` owns its screens
 * and route rules, and says which scenarios they apply to with a `scope` (a recipe module or a fork), not a
 * hand-written scenario list.
 *
 * Route rules run slot by slot (`COASSIST_SLOTS`), first match wins, array order inside a slot. The menu lists
 * screens in the order below, and its groups in `COASSIST_GROUPS` order. derivePatientRoute and the menu both read
 * this map, so a screen cannot be in one and missing from the other.
 *
 * `sticky` marks screens the patient can sit on while the data has not caught up. StateDrivenNav reads it.
 *
 * Module order here sets the order of screens inside a menu group: scheduling before payment before tracking
 * (the order group), pa_notification before cash_offer (the PA group), payment before pharmacy_selection (pricing
 * and pharmacy), provider_transfer before pharmacy_selection (provider transfer).
 */
export const COASSIST_SCREENS: ScreenMap = {
  flows: COASSIST_FLOWS,
  fallback: "/lock-screen",
  hidden: ["/lock-screen"],
  slots: COASSIST_SLOTS,
  groups: COASSIST_GROUPS,
  scenarioDefs: [COA_DTP, COA_COPAY, COA_DME],
  forks: COASSIST_FORKS,

  screens: [
    ...ENROLLMENT_SCREENS,
    ...PA_NOTIFICATION_SCREENS,
    ...CASH_OFFER_SCREENS,
    ...PROVIDER_TRANSFER_SCREENS,
    ...SCHEDULING_SCREENS,
    ...PAYMENT_SCREENS,
    ...PHARMACY_SELECTION_SCREENS,
    ...TRACKING_SCREENS,
  ],

  rules: [
    ...ENROLLMENT_ROUTES,
    ...PA_NOTIFICATION_ROUTES,
    ...PAYMENT_ROUTES,
    ...PHARMACY_SELECTION_ROUTES,
    ...PROVIDER_TRANSFER_ROUTES,
    ...CASH_OFFER_ROUTES,
    ...SCHEDULING_ROUTES,
    ...TRACKING_ROUTES,
  ],
};
