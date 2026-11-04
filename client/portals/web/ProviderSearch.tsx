/**
 * "Find your provider" card from the live Rx page. A name search over a short mock list. Representative people only.
 * On a phone it sits under the dose list, not beside it. Picking a provider shows a summary with a way to change it.
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

export default function ProviderSearch({ value, onChange }: { value: Provider | null; onChange: (p: Provider | null) => void }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const results = q ? PROVIDERS.filter((p) => p.name.toLowerCase().includes(q)) : [];

  return (
    <div className="rounded-lg border border-arx-borders bg-white p-4">
      <h2 className="mb-3 text-base font-semibold text-arx-neutral-800">Find your provider</h2>

      {value ? (
        <div className="rounded-lg border border-arx-borders bg-arx-neutral-100 p-3">
          {detail(value)}
          <button type="button" className="mt-2 text-xs font-semibold text-arx-link" onClick={() => onChange(null)}>
            Change provider
          </button>
        </div>
      ) : (
        <>
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-arx-body-copy" />
            <input
              type="text"
              aria-label="Search provider name"
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
                    onClick={() => { onChange(p); setQuery(""); }}
                  >
                    {detail(p)}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {q && results.length === 0 && <p className="py-2 text-center text-sm text-arx-body-copy">No providers found</p>}
          {!q && <p className="text-xs text-arx-body-copy">Search by name, for example "Chen".</p>}
        </>
      )}
    </div>
  );
}
