import ProgramLogo from "@/components/brand/ProgramLogo";
import { PROGRAM } from "@/config/branding";

export default function InfoCard() {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 border border-arx-borders">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-xl font-bold leading-snug text-arx-slate">
          Everything you need to know about {PROGRAM.name}.
        </h2>
        {/* Color logo on white background */}
        <ProgramLogo
          variant="colors"
          className="h-10 w-auto max-w-[120px] object-contain flex-shrink-0"
        />
      </div>

      <p className="mt-4 text-sm leading-relaxed text-arx-body-copy">
        From identifying financial assistance programs to providing education on your medication, we
        are dedicated to helping you access and stay on your therapy.
      </p>

      <button
        className="mt-5 w-full text-arx-primary font-semibold py-3.5 rounded-lg transition-colors border-2 border-arx-primary bg-transparent hover:bg-arx-primary hover:text-white"
      >
        Learn more
      </button>
    </div>
  );
}
