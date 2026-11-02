import type { ReactNode } from "react";
import { useNavigate } from "@/lib/portalRouter";
import { ArrowLeft } from "lucide-react";

/**
 * Shared shell for the patient-facing 2FA screens (phone-number entry and
 * verification-code entry). Introduced so every "confirm it's you" screen —
 * the first enrollment beat and the post-PA-approval re-check — shares one
 * layout: back arrow, icon + heading banner, a description strip, then a
 * white content area for the actual form. Previously each screen hand-rolled
 * its own header text with no shared structure; this is a deliberate,
 * reusable component (rather than copy-pasted per screen, which is how most
 * of this codebase's one-off UI is built) because the whole point of this
 * pass is a *consistent* 2FA look across screens.
 */
interface TwoFactorShellProps {
  icon: ReactNode;
  title: string;
  description: ReactNode;
  backTo: string;
  children: ReactNode;
}

export default function TwoFactorShell({ icon, title, description, backTo, children }: TwoFactorShellProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-full flex flex-col bg-white">
      {/* Icon + heading banner */}
      <div className="bg-arx-neutral-100 px-5 pt-5 pb-6">
        <button
          onClick={() => navigate(backTo)}
          aria-label="Go back"
          className="text-arx-slate/60 hover:text-arx-slate transition-colors mb-4 -ml-1 p-1"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="w-11 h-11 rounded-full bg-arx-primary flex items-center justify-center text-white mb-3">
          {icon}
        </div>
        <h1 className="text-2xl font-bold text-arx-primary leading-snug">{title}</h1>
      </div>

      {/* Description strip */}
      <div className="border-t border-arx-borders px-5 py-4">
        <p className="text-sm text-arx-body-copy leading-relaxed">{description}</p>
      </div>

      {/* Form content */}
      <div className="flex-1 px-5 py-6">{children}</div>
    </div>
  );
}
