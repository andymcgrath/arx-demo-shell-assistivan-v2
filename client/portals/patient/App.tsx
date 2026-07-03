import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import ConfirmDetails from "./pages/ConfirmDetails";
import Consent from "./pages/Consent";
import Signature from "./pages/Signature";
import UploadInsurance from "./pages/UploadInsurance";
import EnrollmentComplete from "./pages/EnrollmentComplete";
import PAStatus from "./pages/PAStatus";
import PADenied from "./pages/PADenied";
import PAApproved from "./pages/PAApproved";
import CopayEnroll from "./pages/CopayEnroll";
import DeliveryAddress from "./pages/DeliveryAddress";
import DeliveryDate from "./pages/DeliveryDate";
import DeliveryPayment from "./pages/DeliveryPayment";
import DeliveryConfirmation from "./pages/DeliveryConfirmation";
import OrderTracker from "./pages/OrderTracker";
import OrderShipped from "./pages/OrderShipped";
import MedicationDelivered from "./pages/MedicationDelivered";
import NotFound from "./pages/NotFound";
import DesignSystem from "./pages/DesignSystem";
import Admin from "./pages/Admin";
import { ChatProvider, useChatContext } from "@/components/ChatContext";
import ChatModal from "@/components/ChatModal";

const queryClient = new QueryClient();

function AppRoutes() {
  const { chatOpen, closeChat } = useChatContext();
  return (
    <>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/confirm-details" element={<ConfirmDetails />} />
        <Route path="/consent" element={<Consent />} />
        <Route path="/signature" element={<Signature />} />
        <Route path="/upload-insurance" element={<UploadInsurance />} />
        <Route path="/enrollment-complete" element={<EnrollmentComplete />} />
        <Route path="/pa-status" element={<PAStatus />} />
        <Route path="/pa-denied" element={<PADenied />} />
        <Route path="/pa-approved" element={<PAApproved />} />
        <Route path="/copay-enroll" element={<CopayEnroll />} />
        <Route path="/delivery-address" element={<DeliveryAddress />} />
        <Route path="/delivery-date" element={<DeliveryDate />} />
        <Route path="/delivery-payment" element={<DeliveryPayment />} />
        <Route path="/delivery-confirmation" element={<DeliveryConfirmation />} />
        <Route path="/order-tracker" element={<OrderTracker />} />
        <Route path="/order-shipped" element={<OrderShipped />} />
        <Route path="/medication-delivered" element={<MedicationDelivered />} />
        <Route path="/design-system" element={<DesignSystem />} />
        <Route path="/admin" element={<Admin />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      {chatOpen && <ChatModal onClose={closeChat} />}
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <ChatProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </ChatProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);
