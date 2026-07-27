import { useNavigate } from "@/lib/portalRouter";
import PesHome from "@/components/enrollment/PesHome";

/**
 * WF5 (PrES_PAP) patient portal entry — thin wrapper around the shared
 * role-selection screen (client/components/enrollment/PesHome.tsx). Only
 * "Patient/Caregiver" is wired here; Provider/Pharmacist are inert in this
 * portal. See the "pres-home" step in client/portals/provider/index.tsx's
 * PresPapProviderExperience for the provider portal's own wrapper, which
 * wires "Healthcare Provider" instead.
 */
export default function PesHomeScreen() {
  const navigate = useNavigate();
  return (
    <main className="flex-grow">
      <PesHome onSelectPatient={() => navigate("/pes-attestation")} />
    </main>
  );
}
