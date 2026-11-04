/**
 * The client page's intro. The live page sets an icon, a heavy headline and two lines of copy on a pale brand tint,
 * with a soft pill button in the brand wash. On a phone the type steps down and everything stacks left-aligned.
 */
import { ArrowRight } from "lucide-react";
import BrandIcon from "@/portals/patient/components/brand/BrandIcon";

export default function Hero({ onStart }: { onStart: () => void }) {
  return (
    <section className="px-5 pb-10 pt-12 text-arx-neutral-800" style={{ backgroundColor: "hsl(var(--arx-primary-30) / 0.35)" }}>
      <BrandIcon token="primary" className="mb-5 h-14 w-14" />
      <h1 className="mb-3 text-[32px] font-black leading-[1.1]">You're ready to get started!</h1>
      <p className="mb-3 text-base leading-relaxed text-arx-neutral-800">This tool will guide you to understand coverage in a few steps.</p>
      <p className="mb-8 text-xs leading-relaxed text-arx-neutral-800">
        Results do not guarantee coverage benefits and may include discount features for certain, income-eligible families.
      </p>
      <button
        type="button"
        onClick={onStart}
        className="inline-flex items-center gap-2 rounded-full bg-arx-primary-30 px-6 py-3 text-sm font-medium text-arx-neutral-800"
      >
        Get started <ArrowRight className="h-4 w-4" />
      </button>
    </section>
  );
}
