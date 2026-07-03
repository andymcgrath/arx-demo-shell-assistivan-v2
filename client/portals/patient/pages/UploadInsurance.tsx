import { useRef, useState } from "react";
import { useNavigate } from "@/lib/portalRouter";
import { useWorkflowDispatch } from "@/engine/WorkflowProvider";
import { ClipboardList, Camera, Check } from "lucide-react";
import EnrollmentShell from "@/components/enrollment/EnrollmentShell";

interface UploadedFile {
  url: string;
  name: string;
}

export default function UploadInsurance() {
  const navigate = useNavigate();
  const dispatch = useWorkflowDispatch();
  const frontRef = useRef<HTMLInputElement>(null);
  const backRef = useRef<HTMLInputElement>(null);
  const [frontFile, setFrontFile] = useState<UploadedFile | null>(null);
  const [backFile, setBackFile] = useState<UploadedFile | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>, setter: (f: UploadedFile) => void) {
    const file = e.target.files?.[0];
    if (!file) return;
    setter({ url: URL.createObjectURL(file), name: file.name });
  }

  const bothUploaded = !!frontFile && !!backFile;

  return (
    <main className="flex-grow">
        <EnrollmentShell
          icon={<ClipboardList className="w-7 h-7" />}
          title="Upload documents to verify insurance details"
          stepsFilled={3}
          stepsTotal={3}
        >
          {/* Upload rows */}
          <div className="overflow-hidden rounded-xl border border-arx-borders">
            <div className="border-b border-arx-borders">
              <UploadRow
                label={frontFile ? "Insurance card (front)" : "Upload insurance card (front)"}
                thumbnail={frontFile?.url ?? null}
                uploaded={!!frontFile}
                onClick={() => frontRef.current?.click()}
              />
            </div>
            <UploadRow
              label={backFile ? "Insurance card (back)" : "Upload insurance card (back)"}
              thumbnail={backFile?.url ?? null}
              uploaded={!!backFile}
              onClick={() => backRef.current?.click()}
            />
          </div>

          <input ref={frontRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e, setFrontFile)} />
          <input ref={backRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e, setBackFile)} />

          {/* Submit button */}
          <div className="mt-6">
            <button
              onClick={() => { dispatch('CONFIRM_CONSENT', { portal: 'patient' }); navigate("/enrollment-complete"); }}
              disabled={!bothUploaded}
              className={`w-full font-semibold py-4 rounded-lg flex items-center justify-center gap-2 transition-colors ${
                bothUploaded
                  ? "bg-arx-primary text-white hover:bg-arx-primary-dark"
                  : "bg-arx-borders text-arx-inactive cursor-not-allowed"
              }`}
            >
              <span>Submit</span>
              <Check className="w-5 h-5" />
            </button>
          </div>

          <button
            onClick={() => { dispatch('CONFIRM_CONSENT', { portal: 'patient' }); navigate("/enrollment-complete"); }}
            className="w-full mt-3 text-sm text-arx-body-copy hover:text-arx-slate transition-colors text-center"
          >
            Skip for now
          </button>
        </EnrollmentShell>
    </main>
  );
}

function UploadRow({ label, thumbnail, uploaded, onClick }: {
  label: string; thumbnail: string | null; uploaded: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between px-5 py-4 text-left text-arx-slate hover:bg-arx-background transition-colors"
    >
      <div className="flex items-center gap-3">
        {thumbnail && (
          <img src={thumbnail} alt="preview" className="w-12 h-9 object-cover rounded border border-arx-borders" />
        )}
        <span className="text-sm text-arx-slate">{label}</span>
      </div>
      {uploaded ? (
        <div className="w-6 h-6 rounded-full bg-arx-primary flex items-center justify-center flex-shrink-0">
          <Check className="w-3.5 h-3.5 text-white" />
        </div>
      ) : (
        <Camera className="w-5 h-5 flex-shrink-0 text-arx-body-copy" />
      )}
    </button>
  );
}
