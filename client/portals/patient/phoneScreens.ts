/**
 * Screens that stand in for the phone itself: the lock screen and every text-message thread. They fill the phone and
 * carry no header or footer. A new SMS route goes in this list, or it renders inside the program chrome.
 */
export const PHONE_SCREENS = new Set([
  "/lock-screen",
  "/sms-message",
  "/pa-approved-sms",
  "/pap-update-sms",
  "/pes-pap-update-sms",
  "/appointment-confirmation",
  "/cash-offer-sms",
  "/provider-transfer-sms",
  "/pap-transfer-sms",
]);
