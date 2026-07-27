import { useState } from "react";
import { ChevronRight, User } from "lucide-react";
import { useNavigate } from "@/lib/portalRouter";
import EnrollmentShell from "@/components/enrollment/EnrollmentShell";
import { usePatientStore } from "@/store/patientStore";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN",
  "IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH",
  "NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT",
  "VT","VA","WA","WV","WI","WY",
];

const CONTACT_OPTIONS = ["Email and Text", "Email", "Text", "Neither"];

function parseAddress(deliveryAddress: string) {
  // Matches the "Street, City, State ZIP" shape used everywhere else in
  // this shell (see crm/pages/Index.tsx's own parsing of the same field).
  const [street = "", city = "", stateZip = ""] = deliveryAddress.split(", ");
  const [state = "", zip = ""] = stateZip.trim().split(" ");
  return { street, city, state, zip };
}

function FloatingInput({ label, value, onChange, required = true, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; required?: boolean; type?: string;
}) {
  const [focused, setFocused] = useState(false);
  const lifted = focused || value.length > 0;
  return (
    <div className="relative">
      <label
        className="absolute left-4 transition-all duration-150 pointer-events-none font-medium"
        style={{
          top: lifted ? "6px" : "50%",
          transform: lifted ? "none" : "translateY(-50%)",
          fontSize: lifted ? "10px" : "14px",
          color: focused ? "#007178" : "#6F7276",
        }}
      >
        {label}{required && "*"}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="w-full pt-5 pb-2 px-4 rounded-xl text-sm outline-none transition-colors text-arx-slate bg-white"
        style={{ border: `1.5px solid ${focused ? "#007178" : "#E0E0E0"}` }}
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options, required = true }: {
  label: string; value: string; onChange: (v: string) => void; options: string[]; required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-arx-body-copy px-1">{label}{required && "*"}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full py-3 px-4 rounded-xl text-sm outline-none text-arx-slate bg-white border border-arx-borders focus:border-arx-primary transition-colors"
      >
        <option value="">Select one</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

/**
 * WF5 (PrES_PAP) patient info capture — ported from
 * arx-pes-prototype-omniplan's PatientInfo.tsx. Pre-fills from the shared
 * patientStore (rather than starting blank, since the demo persona already
 * has seeded identity data) and writes back into it via updateIdentity() on
 * Continue, so CRM/Provider/Field all see whatever's edited here.
 *
 * The prototype's minor/caregiver branch is intentionally not ported — the
 * seeded demo patient is an adult, and that branch adds a lot of
 * conditional fields for a case this demo shell never actually exercises.
 */
export default function PesPatientInfo() {
  const navigate = useNavigate();
  const patient = usePatientStore();
  const updateIdentity = usePatientStore((s) => s.updateIdentity);

  const [nameParts] = useState(() => {
    const parts = patient.patientName.split(" ");
    return { firstName: parts[0] ?? "", lastName: parts.slice(1).join(" ") };
  });
  const [addressParts] = useState(() => parseAddress(patient.deliveryAddress));

  const [firstName, setFirstName] = useState(nameParts.firstName);
  const [lastName, setLastName] = useState(nameParts.lastName);
  const [dateOfBirth, setDateOfBirth] = useState(patient.patientDob);
  const [gender, setGender] = useState(patient.gender);
  const [address1, setAddress1] = useState(addressParts.street);
  const [address2, setAddress2] = useState("");
  const [city, setCity] = useState(addressParts.city);
  const [state, setState] = useState(addressParts.state);
  const [zip, setZip] = useState(addressParts.zip);
  const [preferredContact, setPreferredContact] = useState(patient.preferredMethodOfContact);
  const [email, setEmail] = useState(patient.email);
  const [primaryPhone, setPrimaryPhone] = useState(patient.phone);
  const [primaryPhoneType, setPrimaryPhoneType] = useState(patient.phoneType);
  const [preferredLanguage, setPreferredLanguage] = useState(patient.preferredLanguage);

  const valid = firstName && lastName && dateOfBirth && gender && address1 && city && state && zip && email && primaryPhone;

  function handleContinue() {
    if (!valid) return;
    updateIdentity({
      patientName: `${firstName} ${lastName}`.trim(),
      patientDob: dateOfBirth,
      gender,
      deliveryAddress: `${address1}${address2 ? " " + address2 : ""}, ${city}, ${state} ${zip}`,
      preferredMethodOfContact: preferredContact,
      email,
      phone: primaryPhone,
      phoneType: primaryPhoneType,
      preferredLanguage,
    });
    navigate("/pes-consent");
  }

  return (
    <main className="flex-grow">
      <EnrollmentShell icon={<User className="w-7 h-7" />} title="Patient Information" stepsFilled={2} stepsTotal={3}>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <FloatingInput label="First Name" value={firstName} onChange={setFirstName} />
            <FloatingInput label="Last Name" value={lastName} onChange={setLastName} />
          </div>

          <div className="grid grid-cols-2 gap-3 items-start">
            <FloatingInput label="Date of Birth (MM/DD/YYYY)" value={dateOfBirth} onChange={setDateOfBirth} />
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-arx-body-copy px-1">Gender*</label>
              <div className="flex gap-3">
                {(["Male", "Female"] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGender(g)}
                    className="flex-1 py-2.5 rounded-lg border text-sm font-semibold transition-colors"
                    style={{
                      borderColor: gender === g ? "hsl(var(--arx-primary))" : "#e5e5e5",
                      backgroundColor: gender === g ? "hsl(var(--arx-sky) / 0.25)" : "white",
                      color: gender === g ? "hsl(var(--arx-primary))" : "#414042",
                    }}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <FloatingInput label="Address 1" value={address1} onChange={setAddress1} />
          <div className="grid grid-cols-2 gap-3">
            <FloatingInput label="Address 2" value={address2} onChange={setAddress2} required={false} />
            <FloatingInput label="City" value={city} onChange={setCity} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <SelectField label="State" value={state} onChange={setState} options={US_STATES} />
            <FloatingInput label="Zip Code" value={zip} onChange={setZip} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <SelectField label="Preferred Contact Method" value={preferredContact} onChange={setPreferredContact} options={CONTACT_OPTIONS} />
            <FloatingInput label="Email" value={email} onChange={setEmail} type="email" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FloatingInput label="Primary Phone" value={primaryPhone} onChange={setPrimaryPhone} type="tel" />
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-arx-body-copy px-1">Phone Type*</label>
              <div className="flex gap-2">
                {["Cell", "Home", "Work"].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setPrimaryPhoneType(t)}
                    className="flex-1 py-2 rounded-lg border text-xs font-semibold transition-colors"
                    style={{
                      borderColor: primaryPhoneType === t ? "hsl(var(--arx-primary))" : "#e5e5e5",
                      backgroundColor: primaryPhoneType === t ? "hsl(var(--arx-sky) / 0.25)" : "white",
                      color: primaryPhoneType === t ? "hsl(var(--arx-primary))" : "#414042",
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-arx-body-copy px-1">Preferred Language*</label>
            <div className="flex gap-2">
              {["English", "Spanish", "Other"].map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setPreferredLanguage(l)}
                  className="flex-1 py-2 rounded-lg border text-xs font-semibold transition-colors"
                  style={{
                    borderColor: preferredLanguage === l ? "hsl(var(--arx-primary))" : "#e5e5e5",
                    backgroundColor: preferredLanguage === l ? "hsl(var(--arx-sky) / 0.25)" : "white",
                    color: preferredLanguage === l ? "hsl(var(--arx-primary))" : "#414042",
                  }}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleContinue}
            disabled={!valid}
            className={`w-full font-semibold py-4 rounded-lg flex items-center justify-center gap-2 mt-2 transition-colors ${
              valid ? "bg-arx-primary text-white hover:bg-arx-primary-dark" : "bg-arx-borders text-arx-inactive cursor-not-allowed"
            }`}
          >
            <span>Continue</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </EnrollmentShell>
    </main>
  );
}
