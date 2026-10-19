import { PROGRAM } from "@/portals/patient/config/branding";

export default function InfoCard() {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 border border-arx-borders">
      {/* No drug logo here. The heading names the drug and the Prescriptions section shows it. */}
      <h2 className="text-h3 text-arx-slate">
        Everything you need to know about {PROGRAM.name}.
      </h2>

      <p className="mt-4 text-body leading-relaxed text-arx-body-copy">
        From identifying financial assistance programs to providing education on your medication, we
        are dedicated to helping you access and stay on your therapy.
      </p>

      <button
        className="mt-5 w-full text-arx-link font-semibold py-3.5 rounded-lg transition-colors border-2 border-arx-primary bg-transparent hover:bg-arx-primary hover:text-white"
      >
        Learn more
      </button>
    </div>
  );
}
