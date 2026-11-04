/**
 * The patient information step of the client page, with the consent language the live page shows: email consent, an
 * ongoing communications choice with its consent text, and the telephone consent. The company's name comes from the
 * brand. The legal name reads "Eli Lilly and Company" style, and falls back to the short name.
 */
import { ArrowRight } from "lucide-react";
import { MANUFACTURER, PROGRAM } from "@/portals/patient/config/branding";
import type { PatientCase } from "@/hooks/usePatientCase";

const field = "w-full rounded-full border border-arx-borders bg-white px-4 py-2.5 text-sm text-arx-neutral-800";
const label = "mb-1 block text-xs font-medium text-arx-neutral-800";
const fine = "text-[11px] leading-relaxed text-arx-body-copy";
const GENDERS = ["Female", "Male", "Non-binary", "Prefer not to say"];

function Policy() {
  return (
    <>
      <a href={MANUFACTURER.legal.privacyUrl} className="underline">Privacy Statement</a> and{" "}
      <a href={MANUFACTURER.legal.termsUrl} className="underline">Terms of Use</a>
    </>
  );
}

interface Props {
  patient: PatientCase;
  gender: string;
  onGender: (v: string) => void;
  zip: string;
  onZip: (v: string) => void;
  ongoing: string;
  onOngoing: (v: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function PatientForm({ patient, gender, onGender, zip, onZip, ongoing, onOngoing, onNext, onBack }: Props) {
  const company = MANUFACTURER.legalName ?? MANUFACTURER.name;
  const [first, ...rest] = patient.patientName.split(" ");
  const ready = !!gender && /^\d{5}$/.test(zip) && !!ongoing;

  return (
    <section>
      <h1 className="mb-2 text-2xl font-extrabold">Patient information</h1>
      <p className="mb-1 text-sm text-arx-neutral-800">Fill out your information to check your insurance coverage.</p>
      <p className="mb-5 text-xs text-arx-body-copy">All fields are required unless noted as optional.</p>

      <div className="mb-4 space-y-3">
        <div><label className={label} htmlFor="wp-first">First name</label><input id="wp-first" className={field} defaultValue={first} /></div>
        <div><label className={label} htmlFor="wp-last">Last name</label><input id="wp-last" className={field} defaultValue={rest.join(" ")} /></div>
        <div><label className={label} htmlFor="wp-dob">Date of birth</label><input id="wp-dob" className={field} defaultValue={patient.patientDob} /></div>
        <div>
          <label className={label} htmlFor="wp-gender">Gender</label>
          <select id="wp-gender" className={field} value={gender} onChange={(e) => onGender(e.target.value)}>
            <option value="" disabled>Select</option>
            {GENDERS.map((g) => <option key={g}>{g}</option>)}
          </select>
        </div>
        <div>
          <label className={label} htmlFor="wp-zip">Zip code</label>
          <input id="wp-zip" inputMode="numeric" maxLength={5} className={field} value={zip} onChange={(e) => onZip(e.target.value.replace(/\D/g, ""))} />
        </div>
        <div><label className={label} htmlFor="wp-email">Email</label><input id="wp-email" type="email" className={field} defaultValue={patient.email} /></div>
      </div>

      <p className={`${fine} mb-5`}>
        By entering your email and clicking "Continue," you agree to receive email communications on your personalized coverage results upon completing the tool. For more information about {company}'s privacy practices, please visit the <Policy />.
      </p>

      <p className="mb-2 text-sm font-medium">Would you like to receive ongoing communications?</p>
      <div className="mb-3 space-y-2">
        {["Yes", "No"].map((o) => (
          <label key={o} className="flex items-center gap-2 text-sm">
            <input type="radio" name="ongoing" checked={ongoing === o} onChange={() => onOngoing(o)} /> {o}
          </label>
        ))}
      </div>
      <div className={`${fine} mb-5 space-y-2`}>
        <p>
          By selecting "Yes" you consent to {company}'s use, disclosure and transfer of your personal information, including health information for the purposes of contacting you about developments and programs as well as future product updates and activities; analyzing and measuring program performance, effectiveness, and supporting future improvements to your user experience; creating a preference profile, which may use data previously provided to {company}.
        </p>
        <p>
          You consent to have {company} collect and use your name and email address to contact about your {company} profile and to personalize your experience. For more information about {company}'s privacy practices, please review the <Policy />.
        </p>
      </div>

      <label className={label} htmlFor="wp-phone">Phone number (optional)</label>
      <input id="wp-phone" type="tel" className={`${field} mb-3`} defaultValue={patient.phone} />
      <p className={`${fine} mb-6`}>
        By providing your telephone number and selecting "Continue," you agree to receive automated marketing calls and texts about your {PROGRAM.name} treatment journey from and on behalf of {company}, and you understand that you are not required to provide your number as a condition of receiving goods and services. Message and data rates may apply. For more information about {company}'s privacy practices, please visit the <Policy />.
      </p>

      <div className="flex gap-3">
        <button
          type="button"
          disabled={!ready}
          onClick={onNext}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-arx-action px-6 py-2.5 text-sm font-semibold text-arx-on-action disabled:opacity-40"
        >
          Continue <ArrowRight className="h-4 w-4" />
        </button>
        <button type="button" className="rounded-full border border-arx-borders px-5 py-2.5 text-sm" onClick={onBack}>Back</button>
      </div>
    </section>
  );
}
