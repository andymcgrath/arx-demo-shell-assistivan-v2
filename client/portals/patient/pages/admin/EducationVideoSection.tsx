import LogoPicker from "./LogoPicker";

export interface EducationVideoData {
  title: string;
  description: string;
  thumbnail: string;
  embedUrl: string;
}

interface Props {
  data: EducationVideoData;
  onChange: (data: EducationVideoData) => void;
}

/** Optional resource card shown on the patient portal's "Delivered" page
 * (e.g. Boehringer's "Pulmonary fibrosis basics" video). Leaving Video
 * Embed URL blank hides the whole card — see the `embedUrl` check in
 * MedicationDelivered.tsx. */
export default function EducationVideoSection({ data, onChange }: Props) {
  function set<K extends keyof EducationVideoData>(key: K, value: EducationVideoData[K]) {
    onChange({ ...data, [key]: value });
  }

  return (
    <div className="space-y-4">
      <Field
        label="Title"
        hint="Headline shown on the video card and in the modal header."
        value={data.title}
        onChange={v => set("title", v)}
        placeholder="e.g. What's a healthy lung vs. a lung with inflammation and fibrosis?"
      />
      <Field
        label="Description"
        hint="Short blurb under the title — e.g. length and topic."
        value={data.description}
        onChange={v => set("description", v)}
        placeholder="e.g. A short animation on the basics — 2 min watch."
      />
      <LogoPicker
        label="Thumbnail"
        hint="Preview image shown behind the play button."
        value={data.thumbnail}
        onChange={url => set("thumbnail", url)}
      />
      <Field
        label="Video Embed URL"
        hint="Player embed URL (e.g. a Vimeo or YouTube embed link). Leave blank to hide this card entirely."
        value={data.embedUrl}
        onChange={v => set("embedUrl", v)}
        placeholder="https://player.vimeo.com/video/…"
      />
    </div>
  );
}

function Field({ label, hint, value, onChange, placeholder }: { label: string; hint?: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-[--arx-slate]">{label}</label>
      {hint && <p className="text-xs text-[--arx-inactive]">{hint}</p>}
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full text-sm border border-[--arx-borders] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--arx-primary))] bg-white"
      />
    </div>
  );
}
