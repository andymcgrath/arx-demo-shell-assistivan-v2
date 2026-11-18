/**
 * Personas — who the presenter is acting as in each shell tab.
 *
 * A tab with no entry here shows no persona strip.
 * `name` is optional: the Case Manager, Field team, Workforce, and Rules entries are roles, not named people.
 * All names are representative.
 */
import type { PortalId } from "./DemoShell";

export interface Persona {
  name?: string;
  role: string;
}

export const PERSONAS: Partial<Record<PortalId, Persona>> = {
  crm: { role: "Case Manager" },
  patient: { name: "Keanu", role: "Patient" },
  provider: { name: "Dr. Sarah Chen", role: "Provider" },
  field: { role: "Field team" },
  // No named person. A role label keeps the strip, and its tint, on every tab.
  analytics: { role: "Workforce management" },
  rules: { role: "Administrator" },
};

function initials(p: Persona): string {
  const source = p.name ?? p.role;
  const words = source.replace(/^Dr\.\s*/, "").split(/\s+/).filter(Boolean);
  return (words.length > 1 ? words[0][0] + words[words.length - 1][0] : words[0].slice(0, 2)).toUpperCase();
}

/** Avatar, name, and role for the persona behind a tab. Renders nothing when the tab has none. */
export function PersonaChip({ portal, color }: { portal: PortalId; color: string }) {
  const persona = PERSONAS[portal];
  if (!persona) return null;
  return (
    // The tint stays inside this box. Nothing around it takes the color.
    <div
      className="flex items-center gap-2 min-w-0 rounded-md border px-2 py-1"
      style={{ backgroundColor: `${color}26`, borderColor: `${color}80` }}
      data-testid="persona-chip"
    >
      <span
        className="flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold text-white shrink-0"
        style={{ background: color }}
        aria-hidden="true"
      >
        {initials(persona)}
      </span>
      <span className="text-[12px] leading-tight truncate">
        {persona.name && <span className="font-semibold text-white">{persona.name}</span>}
        {persona.name && <span className="text-white/40"> · </span>}
        <span className={persona.name ? "text-white/60" : "font-semibold text-white"}>{persona.role}</span>
      </span>
    </div>
  );
}
