/**
 * The provider card from the live Rx page. Benefit verification and prior authorization both need the prescriber's
 * NPI. The patient either types the number or finds the provider by name, so no one has to know it. A name search runs
 * over a short mock list. Representative people only. On a phone the card sits under the dose list.
 */
import { useState } from "react";
import { Search } from "lucide-react";

export interface Provider {
  id: number;
  name: string;
  npi: string;
  city: string;
  state: string;
}

const PROVIDERS: Provider[] = [
  { id: 1, name: "Dr. Sarah Johnson", npi: "1234567890", city: "New York", state: "NY" },
  { id: 2, name: "Dr. Michael Chen", npi: "0987654321", city: "Los Angeles", state: "CA" },
  { id: 3, name: "Dr. Emily Rodriguez", npi: "5555555555", city: "Chicago", state: "IL" },
  { id: 4, name: "Dr. James Wilson", npi: "4444444444", city: "Houston", state: "TX" },
  { id: 5, name: "Dr. Lisa Anderson", npi: "3333333333", city: "Phoenix", state: "AZ" },
];

const detail = (p: Provider) => (
  <>
    <p className="text-sm font-semibold text-arx-neutral-800">{p.name}</p>
    <p className="text-xs text-arx-body-copy">NPI: {p.npi}</p>
    <p className="text-xs text-arx-body-copy">{p.city}, {p.state}</p>
  </>
);

export const isNpi = (s: string) => /^\d{10}$/.test(s);

interface Props {
  value: Provider | null;
  onChange: (p: Provider | null) => void;
  npi: string;
  onNpi: (npi: string) => void;
}

export default function ProviderSearch({ value, onChange, npi, onNpi }: Props) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const results = q ? PROVIDERS.filter((p) => p.name.toLowerCase().includes(q)) : [];

  return (
    <div className="rounded-lg border border-arx-borders bg-white p-4">
      <h2 className="mb-1 text-base font-semibold text-arx-neutral-800">Your provider</h2>
      <p className="mb-3 text-xs text-arx-body-copy">We use your provider's NPI to check your coverage. Enter it, or find your provider by name.</p>

      {value ? (
        <div className="rounded-lg border border-arx-borders bg-arx-neutral-100 p-3">
          {detail(value)}
          <button type="button" className="mt-2 text-xs font-semibold text-arx-link" onClick={() => { onChange(null); onNpi(""); }}>
            Change provider
          </button>
        </div>
      ) : (
        <>
          <label className="mb-1 block text-xs font-medium text-arx-neutral-800" htmlFor="web-npi">NPI number</label>
          <input
            id="web-npi"
            inputMode="numeric"
            maxLength={10}
            placeholder="10 digits"
            value={npi}
            onChange={(e) => onNpi(e.target.value.replace(/\D/g, ""))}
            className="mb-1 w-full rounded-lg border border-arx-borders bg-white px-3 py-2 text-sm"
          />
          {npi && !isNpi(npi) && <p className="mb-2 text-xs text-arx-errors">An NPI has 10 digits.</p>}
          <p className="my-3 text-center text-xs text-arx-body-copy">or</p>
          <label className="mb-1 block text-xs font-medium text-arx-neutral-800" htmlFor="web-provider-search">Find your provider</label>
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-arx-body-copy" />
            <input
              type="text"
              id="web-provider-search"
              placeholder="Search provider name..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-lg border border-arx-borders bg-white py-2 pl-9 pr-3 text-sm"
            />
          </div>
          {results.length > 0 && (
            <ul className="space-y-2">
              {results.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className="w-full rounded-lg border border-arx-borders p-3 text-left"
                    onClick={() => { onChange(p); onNpi(p.npi); setQuery(""); }}
                  >
                    {detail(p)}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {q && results.length === 0 && <p className="py-2 text-center text-sm text-arx-body-copy">No providers found</p>}
        </>
      )}
    </div>
  );
}
