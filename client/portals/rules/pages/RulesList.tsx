/**
 * RulesList — "Active Business Rules" grouped table (the Action Factory
 * rules list scoped to the one Profile in this demo — its display name is
 * the admin-designated program name, read reactively below, not hardcoded).
 *
 * Also surfaces two "Demo cases" quick links at the bottom. The recording's
 * Cases live in a separate, pre-existing Salesforce Case app, not inside
 * "Product Configuration" — this new portal has no case *list* screen of
 * its own per spec (only Case/Stage detail pages were asked for), so these
 * links are the way to reach the two seeded cases and actually exercise the
 * rules engine. See the "Interactive wiring" section of the build spec.
 */
import { useNavigate } from "@/lib/portalRouter";
import RulesAppShell from "../components/RulesAppShell";
import { useRulesPortalStore } from "@/store/rulesPortalStore";
import { usePatientStore } from "@/store/patientStore";
import { RULES } from "../data/rulesData";
import { SfLink, SfPrimaryButton } from "../components/SfPrimitives";

function truncate(text: string, max = 100) {
  return text.length > max ? text.slice(0, max).trimEnd() + "..." : text;
}

export default function RulesList() {
  const navigate = useNavigate();
  const cases = useRulesPortalStore((s) => s.cases);
  const customRules = useRulesPortalStore((s) => s.customRules);
  const drugName = usePatientStore((s) => s.drugName);

  // customRules holds rules the presenter creates live (see
  // rulesPortalStore.ts's "Bridge to the real engine" section) — merged in
  // here so a newly created rule appears in this list exactly like the 9
  // seeded ones, under its own category group.
  const allRules = [...RULES, ...customRules];
  const grouped: Record<string, typeof RULES> = {};
  for (const r of allRules) {
    (grouped[r.listCategory] ??= []).push(r);
  }

  return (
    <RulesAppShell active="rules">
      <div className="bg-white p-5">
        <div className="flex items-start justify-between gap-3 mb-1">
          <div className="text-[12px] text-[#706e6b]">
            Profile: <SfLink onClick={() => navigate("/profile/wegovy")}>{drugName}</SfLink>
          </div>
          <SfPrimaryButton onClick={() => navigate("/rule/new")}>+ New Rule</SfPrimaryButton>
        </div>
        <h1 className="text-[20px] font-bold text-[#3e3e3c] mb-4">Active Business Rules</h1>

        {Object.entries(grouped).map(([category, rules]) => (
          <div key={category} className="mb-6 border border-[#dddbda] rounded overflow-hidden">
            <div className="px-3 py-2 bg-[#f3f3f3] border-b border-[#dddbda] text-[13px] font-semibold text-[#3e3e3c]">
              {category} ({rules.length}{category === "Enrollment" ? "+" : ""})
            </div>
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[#dddbda]">
                  <th className="text-left px-3 py-2 text-[11px] text-[#706e6b] font-medium w-36">External ID</th>
                  <th className="text-left px-3 py-2 text-[11px] text-[#706e6b] font-medium w-72">Rule Name</th>
                  <th className="text-left px-3 py-2 text-[11px] text-[#706e6b] font-medium">Description</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((r) => (
                  <tr key={r.externalId} className="border-b border-[#dddbda] last:border-b-0 hover:bg-[#f8f9fb]">
                    <td className="px-3 py-2 text-[#3e3e3c] whitespace-nowrap">{r.externalId}</td>
                    <td className="px-3 py-2">
                      <SfLink onClick={() => navigate(`/rule/${r.externalId}`)}>{r.ruleName}</SfLink>
                    </td>
                    <td className="px-3 py-2 text-[#3e3e3c]" title={r.description}>
                      {truncate(r.description)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

        <div className="mt-8 pt-4 border-t border-[#dddbda]">
          <div className="text-[11px] text-[#706e6b] uppercase tracking-wide mb-2">Demo cases</div>
          <div className="flex flex-wrap gap-4 text-[13px]">
            {cases.map((c) => (
              <SfLink key={c.id} onClick={() => navigate(`/case/${c.id}`)}>
                Case {c.caseNumber} — {c.accountName}
              </SfLink>
            ))}
          </div>
        </div>
      </div>
    </RulesAppShell>
  );
}
