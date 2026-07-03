import { useState } from "react";
import { useNavigate } from "@/lib/portalRouter";
import { MapPin, ChevronRight } from "lucide-react";
import EnrollmentShell from "@/components/enrollment/EnrollmentShell";

interface AddressForm { address: string; city: string; state: string; zip: string; }

function FloatingInput({ label, value, onChange, required }: {
  label: string; value: string; onChange: (v: string) => void; required?: boolean;
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
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="w-full pt-5 pb-2 px-4 rounded-xl text-sm outline-none transition-colors text-arx-slate bg-white"
        style={{ border: `1.5px solid ${focused ? "#007178" : "#E0E0E0"}` }}
      />
    </div>
  );
}

export default function DeliveryAddress() {
  const navigate = useNavigate();
  const [form, setForm] = useState<AddressForm>({ address: "789 Oakridge Avenue", city: "Fairview", state: "TX", zip: "75069" });
  const valid = form.address && form.city && form.state && form.zip;
  const set = (field: keyof AddressForm) => (v: string) => setForm(prev => ({ ...prev, [field]: v }));

  return (
    <main className="flex-grow">
        <EnrollmentShell icon={<MapPin className="w-7 h-7" />} title="Where do you want to receive your shipment?" stepsFilled={1} stepsTotal={2}>
          <div className="space-y-4">
            <FloatingInput label="Address" value={form.address} onChange={set("address")} required />
            <FloatingInput label="City" value={form.city} onChange={set("city")} required />
            <FloatingInput label="State" value={form.state} onChange={set("state")} required />
            <FloatingInput label="ZIP Code" value={form.zip} onChange={set("zip")} required />

            <button
              onClick={() => valid && navigate("/delivery-date")}
              disabled={!valid}
              className={`w-full font-semibold py-3.5 rounded-lg flex items-center justify-center gap-2 mt-2 transition-colors ${valid ? "bg-arx-primary text-white hover:bg-arx-primary-dark" : "bg-arx-borders text-arx-inactive cursor-not-allowed"}`}
            >
              <span>Continue</span>
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </EnrollmentShell>
    </main>
  );
}
