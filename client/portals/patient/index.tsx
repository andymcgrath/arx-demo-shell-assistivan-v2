/**
 * Patient Portal — Shell wrapper
 *
 * Wrapped in .portal-patient so CSS variables and font are scoped to the
 * AssistRx design system without bleeding into other portals.
 *
 * StateDrivenNav is the "event harness" for this portal: it watches the
 * shared Zustand demo state and navigates to the correct patient page
 * automatically. The CRM/HUB drives the workflow; this portal reflects it.
 *
 * State → Route mapping:
 *   pharmacy_status delivered  → /medication-delivered
 *   pharmacy_status shipped    → /order-shipped
 *   pharmacy_status processing → /order-tracker
 *   pa_status denied           → /pa-denied
 *   pa_status approved         → /pa-approved
 *   pa_status submitted        → /pa-status
 *   consent_status confirmed   → /enrollment-complete
 *   enrollment_status enrolled → /consent  (awaiting consent signature)
 *   (default)                  → /         (welcome / not yet enrolled)
 */
import { useEffect, useRef } from "react";
import { PortalRouter, Routes, Route, useNavigate, useLocation } from "@/lib/portalRouter";
import { ChatProvider, useChatContext } from "./components/ChatContext";
import ChatModal from "./components/ChatModal";
import { derivePatientRoute } from "@/engine/WorkflowEngine";
import { useWorkflowActor } from "@/engine/WorkflowProvider";
import { useSelector } from "@xstate/react";
import { useDemoStore } from "@/store/demoStore";

const DELIVERY_FLOW_PATHS = [
  '/phone-verification',
  '/pa-approved-sms',
  '/pa-approved-otp',
  '/benefit-pricing',
  '/copay-enroll',
  '/delivery-address',
  '/delivery-date',
  '/delivery-payment',
  '/delivery-confirmation',
  '/order-tracker',
  '/order-shipped',
];
import Header from "./components/Header";
import Footer from "./components/Footer";

import LockScreen from "./pages/LockScreen";
import SMSMessage from "./pages/SMSMessage";
import PhoneVerification from "./pages/PhoneVerification";
import OTPVerification from "./pages/OTPVerification";
import Index from "./pages/Index";
import ConfirmDetails from "./pages/ConfirmDetails";
import Consent from "./pages/Consent";
import Signature from "./pages/Signature";
import UploadInsurance from "./pages/UploadInsurance";
import EnrollmentComplete from "./pages/EnrollmentComplete";
import PAStatus from "./pages/PAStatus";
import PADenied from "./pages/PADenied";
import PAApproved from "./pages/PAApproved";
import PaApprovedSms from "./pages/PaApprovedSms";
import PaApprovedOtp from "./pages/PaApprovedOtp";
import PapUpdateSms from "./pages/PapUpdateSms";
import PapUpdateOtp from "./pages/PapUpdateOtp";
import BenefitPricing from "./pages/BenefitPricing";
import CopayEnroll from "./pages/CopayEnroll";
import DeliveryAddress from "./pages/DeliveryAddress";
import DeliveryDate from "./pages/DeliveryDate";
import DeliveryPayment from "./pages/DeliveryPayment";
import DeliveryConfirmation from "./pages/DeliveryConfirmation";
import OrderTracker from "./pages/OrderTracker";
import OrderShipped from "./pages/OrderShipped";
import MedicationDelivered from "./pages/MedicationDelivered";
import IncomeQualification from "./pages/IncomeQualification";
import PapIncomeVerification from "./pages/PapIncomeVerification";
import PapEnrollmentComplete from "./pages/PapEnrollmentComplete";


/** Watches actor state and navigates the patient portal accordingly */
function StateDrivenNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    pathnameRef.current = pathname;
  });

  const actor = useWorkflowActor();

  const targetRoute = useSelector(
    actor,
    (snapshot) => derivePatientRoute(snapshot.context)
  );

  // Reset All bumps this on every resetDemo() call. A bump means the operator
  // just reset the workflow to its starting stage, and the portal must snap
  // back to the correct screen even if it's currently sitting on a page that
  // the delivery-flow guard below would normally leave alone.
  const resetNonce = useDemoStore((s) => s.resetNonce);
  const lastResetNonceRef = useRef(resetNonce);

  useEffect(() => {
    const isReset = resetNonce !== lastResetNonceRef.current;
    lastResetNonceRef.current = resetNonce;

    // Compare against actual current path, not last-navigated-by-this-hook,
    // so the portal stays in sync even if the user navigated manually within it
    if (pathnameRef.current === targetRoute) return;

    // Don't interrupt delivery/order flows — user may have manually navigated.
    // A reset overrides this: the screen must always land on the correct step.
    if (!isReset && DELIVERY_FLOW_PATHS.includes(pathnameRef.current)) return;

    navigate(targetRoute, { replace: true });
  }, [targetRoute, navigate, resetNonce]);

  return null;
}

function PatientRoutes() {
  const ctx = useChatContext();
  const { pathname } = useLocation();

  // Show header and footer starting from phone verification onwards
  // (not for lock-screen and sms-message which should feel like a phone)
  const showHeaderFooter = pathname !== "/lock-screen" && pathname !== "/sms-message" && pathname !== "/pa-approved-sms" && pathname !== "/pap-update-sms";

  return (
    <div className="flex flex-col h-full">
      {showHeaderFooter && <Header />}
      <div className="flex-1 overflow-x-hidden">
        <StateDrivenNav />
        <Routes>
          <Route path="/lock-screen"          element={<LockScreen />} />
          <Route path="/sms-message"           element={<SMSMessage />} />
          <Route path="/phone-verification"    element={<PhoneVerification />} />
          <Route path="/otp-verification"      element={<OTPVerification />} />
          <Route path="/"                      element={<Index />} />
          <Route path="/confirm-details"       element={<ConfirmDetails />} />
          <Route path="/consent"               element={<Consent />} />
          <Route path="/signature"             element={<Signature />} />
          <Route path="/upload-insurance"      element={<UploadInsurance />} />
          <Route path="/enrollment-complete"   element={<EnrollmentComplete />} />
          <Route path="/pa-status"             element={<PAStatus />} />
          <Route path="/pa-denied"             element={<PADenied />} />
          <Route path="/pa-approved"           element={<PAApproved />} />
          <Route path="/pa-approved-sms"       element={<PaApprovedSms />} />
          <Route path="/pa-approved-otp"       element={<PaApprovedOtp />} />
          <Route path="/pap-update-sms"        element={<PapUpdateSms />} />
          <Route path="/pap-update-otp"        element={<PapUpdateOtp />} />
          <Route path="/benefit-pricing"       element={<BenefitPricing />} />
          <Route path="/copay-enroll"          element={<CopayEnroll />} />
          <Route path="/delivery-address"      element={<DeliveryAddress />} />
          <Route path="/delivery-date"         element={<DeliveryDate />} />
          <Route path="/delivery-payment"      element={<DeliveryPayment />} />
          <Route path="/delivery-confirmation" element={<DeliveryConfirmation />} />
          <Route path="/order-tracker"         element={<OrderTracker />} />
          <Route path="/order-shipped"         element={<OrderShipped />} />
          <Route path="/medication-delivered"  element={<MedicationDelivered />} />
          <Route path="/income-qualification"      element={<IncomeQualification />} />
          <Route path="/pap-income-verification"  element={<PapIncomeVerification />} />
          <Route path="/pap-enrollment-complete"  element={<PapEnrollmentComplete />} />
        </Routes>
        {ctx?.chatOpen && <ChatModal onClose={ctx.closeChat} />}
      </div>
      {showHeaderFooter && <Footer />}
    </div>
  );
}

export default function PatientPortal() {
  const actor = useWorkflowActor();
  const initialPath = derivePatientRoute(actor.getSnapshot().context);
  return (
    <div className="portal-patient h-full flex flex-col">
      <PortalRouter initialPath={initialPath}>
        <ChatProvider>
          <PatientRoutes />
        </ChatProvider>
      </PortalRouter>
    </div>
  );
}
