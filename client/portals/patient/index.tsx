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
import { useWorkflowActor, usePersonaState } from "@/engine/WorkflowProvider";
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
  // iAssist_PAP (WF5) only: /infusion-date is this flow's replacement for
  // /delivery-date (see InfusionDate.tsx) — same manual-navigation
  // tolerance while the patient is mid-selection, before
  // PATIENT_SELECTS_INFUSION_DATE has fired. InfusionDate.tsx's handleSave()
  // then does a one-time manual navigate() to /appointment-confirmation (a
  // "text from the doctor's office" beat) even though derivePatientRoute
  // itself now targets /medication-delivered the moment infusionDate is set
  // — without this entry, that fresh derivePatientRoute computation would
  // bounce the patient off the SMS screen before they've read it.
  '/infusion-date',
  '/appointment-confirmation',
  // /medication-delivered is every flow's shared terminal "what's next"
  // screen, including iAssist_PAP (WF5) since derivePatientRoute now points
  // there once appealStatus is 'approved' and infusionDate is set (see
  // WorkflowEngine.ts) — AppointmentConfirmation.tsx's own link forward
  // lands here too, same as every other flow's dispatch-complete state.
  '/medication-delivered',
  // WF5 (PrES_PAP) only: /pes-home and /pes-attestation share the exact same
  // underlying machine state (enrollmentStatus 'none') — role selection and
  // the has-prescription question both happen before ENROLL ever fires. Once
  // the patient clicks past /pes-home to /pes-attestation, this guard keeps
  // derivePatientRoute's still-correct-but-stale '/pes-home' target from
  // bouncing them straight back, the same way the delivery/order paths above
  // tolerate a manual forward navigation ahead of what the state machine has
  // caught up to yet.
  '/pes-attestation',
  // WF5 (PrES_PAP) only: /pes-home and /pes-income-consent share the same
  // gate (papSmsVerified === true && incomeStatus === 'none') once a
  // provider's referral has cleared BI and the Fulfillment Center's
  // "application update" SMS has been tapped — see WorkflowEngine.ts's
  // PrES_PAP branch and pes-home's own patient wrapper, which is what
  // actually navigates here. Same tolerance as the /pes-attestation entry
  // above, one phase later.
  '/pes-income-consent',
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
import PesHome from "./pages/PesHome";
import PesPapUpdateSms from "./pages/PesPapUpdateSms";
import PesAttestation from "./pages/PesAttestation";
import PesPatientInfo from "./pages/PesPatientInfo";
import PesConsent from "./pages/PesConsent";
import PesIncomeConsent from "./pages/PesIncomeConsent";
import PesIncomeSubmission from "./pages/PesIncomeSubmission";
import PesPapTerms from "./pages/PesPapTerms";
import PesConfirmation from "./pages/PesConfirmation";
import InfusionDate from "./pages/InfusionDate";
import AppointmentConfirmation from "./pages/AppointmentConfirmation";


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
  const { workflowData } = usePersonaState('patient');

  // WF5 (PrES_PAP) is the one flow rendered as a plain (tall, scrollable)
  // web page rather than inside the fixed-height iPhone mockup (see
  // DemoShell.tsx's Panel) — its outer wrapper needs min-h-full instead of
  // h-full so it can actually grow past one viewport's height. h-full
  // (height: 100%) caps this div to DemoShell's wide-pane height no matter
  // how tall the real page content is, which was forcing Footer to dock at
  // that fixed height and overlap/truncate whatever card content didn't
  // fit — see PatientPortal's matching root-div fix below. Every other
  // flow keeps h-full unchanged (their phone-mockup ancestor is a fixed,
  // overflow:hidden box either way, so min-h-full wouldn't help them and
  // risks changing behavior that already works for those flows).
  const isWideFlow = workflowData.flowType === 'PrES_PAP';

  // Show header and footer starting from phone verification onwards
  // (not for lock-screen and sms-message which should feel like a phone).
  // /pes-pap-update-sms (WF5) joins this list too — DemoShell.tsx's Panel
  // renders it inside the real iPhone-mockup frame (see
  // showPesPapUpdateSmsPhone there), so it needs to feel like a phone
  // screen the same way, with no CoAssist web chrome around it.
  // /appointment-confirmation (iAssist_PAP/WF5 only) is the same "doctor's
  // office text message" pattern as /sms-message — it was left out of this
  // list originally, which is why it rendered sandwiched between the white
  // Header/Footer instead of full-screen black like every other SMS-bubble
  // screen (AppointmentConfirmation.tsx).
  const showHeaderFooter = pathname !== "/lock-screen" && pathname !== "/sms-message" && pathname !== "/pa-approved-sms" && pathname !== "/pap-update-sms" && pathname !== "/pes-pap-update-sms" && pathname !== "/appointment-confirmation";

  return (
    <div className={`flex flex-col ${isWideFlow ? "min-h-full" : "h-full"}`}>
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
          <Route path="/pes-home"               element={<PesHome />} />
          <Route path="/pes-pap-update-sms"     element={<PesPapUpdateSms />} />
          <Route path="/pes-attestation"        element={<PesAttestation />} />
          <Route path="/pes-patient-info"       element={<PesPatientInfo />} />
          <Route path="/pes-consent"            element={<PesConsent />} />
          <Route path="/pes-income-consent"     element={<PesIncomeConsent />} />
          <Route path="/pes-income-submission"  element={<PesIncomeSubmission />} />
          <Route path="/pes-pap-terms"          element={<PesPapTerms />} />
          <Route path="/pes-confirmation"       element={<PesConfirmation />} />
          <Route path="/infusion-date"          element={<InfusionDate />} />
          <Route path="/appointment-confirmation" element={<AppointmentConfirmation />} />
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
  // Mirrors PatientRoutes' own isWideFlow check just below — this outer
  // root div needs the same min-h-full-instead-of-h-full treatment for WF5,
  // otherwise this box caps back to one viewport height one level higher up
  // and the fix inside PatientRoutes never gets the chance to matter.
  const isWideFlow = actor.getSnapshot().context.workflowData.flowType === 'PrES_PAP';
  return (
    <div className={`portal-patient flex flex-col ${isWideFlow ? "min-h-full" : "h-full"}`}>
      <PortalRouter initialPath={initialPath}>
        <ChatProvider>
          <PatientRoutes />
        </ChatProvider>
      </PortalRouter>
    </div>
  );
}
