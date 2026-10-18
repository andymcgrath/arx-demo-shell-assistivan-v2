import ProgramLogo from "@/portals/patient/components/brand/ProgramLogo";
import { PROGRAM } from "@/portals/patient/config/branding";

export default function InfoCard() {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 border border-arx-borders">
      {/* Drug logo above the heading. A drug with no logo file shows no logo here,
          because the heading already names it. */}
      {PROGRAM.assets.logoColor && <ProgramLogo variant="colors" className="mb-3" />}

      <h2 className="text-xl font-bold leading-snug text-arx-slate">
        Everything you need to know about {PROGRAM.name}.
      </h2>

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
