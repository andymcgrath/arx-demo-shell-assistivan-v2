import { useRef, useState, useEffect } from "react";
import { useNavigate } from "@/lib/portalRouter";
import { usePatientCase } from "@/hooks/usePatientCase";
import { usePersonaState, useWorkflowDispatch } from "@/engine/WorkflowProvider";
import { PenLine, ChevronRight } from "lucide-react";
import EnrollmentShell from "@/components/enrollment/EnrollmentShell";

export default function Signature() {
  const navigate = useNavigate();
  const dispatch = useWorkflowDispatch();
  const { data: patient } = usePatientCase();
  const { workflowData } = usePersonaState('patient');
  // Fax_PAP_Audit (WF2/PAP) patients have no insurance by definition — the
  // "Upload Insurance" step doesn't apply to them. Header.tsx's own nav list
  // already sends them to Income Verification next; this just matches it.
  const isPapFlow = workflowData.flowType === "Fax_PAP_Audit";
  const nextPath = isPapFlow ? "/income-qualification" : "/upload-insurance";
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.strokeStyle = "#414042";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  function getPos(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      const touch = e.touches[0];
      return { x: (touch.clientX - rect.left) * scaleX, y: (touch.clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }

  function startDraw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const ctx = canvasRef.current!.getContext("2d")!;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
  }

  function draw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault();
    if (!isDrawing) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasSignature(true);
  }

  function endDraw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault();
    setIsDrawing(false);
  }

  function clearCanvas() {
    const canvas = canvasRef.current!;
    canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  }

  return (
    <main className="flex-grow">
        <EnrollmentShell
          icon={<PenLine className="w-7 h-7" />}
          title="Please provide your signature"
          stepsFilled={2}
          stepsTotal={3}
        >
          {/* Patient name */}
          <div className="relative border-b border-arx-borders px-1 pt-5 pb-2 mb-5">
            <span className="absolute top-2 left-1 text-xs text-arx-body-copy">Patient name</span>
            <input
              type="text"
              defaultValue={patient.patientName}
              className="w-full text-base bg-transparent outline-none text-arx-slate"
            />
          </div>

          {/* Signature canvas */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-base font-medium text-arx-slate">Signature</span>
              <button
                onClick={clearCanvas}
                className="text-sm font-medium rounded-lg px-4 py-1 border border-arx-borders text-arx-body-copy hover:bg-arx-background transition-colors"
              >
                Clear
              </button>
            </div>

            <div className="rounded-xl overflow-hidden border border-arx-borders bg-white">
              <canvas
                ref={canvasRef}
                width={600}
                height={200}
                className="w-full touch-none"
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={endDraw}
                onMouseLeave={endDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={endDraw}
              />
            </div>
          </div>

          {/* Continue button */}
          <div className="mt-6">
            <button
              onClick={() => {
                // PAP skips Upload Insurance entirely, which is normally
                // where CONFIRM_CONSENT fires — dispatch it here instead so
                // consentStatus still flips to 'confirmed' for this flow.
                if (isPapFlow) dispatch('CONFIRM_CONSENT', { portal: 'patient' });
                navigate(nextPath);
              }}
              disabled={!hasSignature}
              className={`w-full font-semibold py-4 rounded-lg flex items-center justify-center gap-2 transition-colors ${
                hasSignature
                  ? "bg-arx-primary text-white hover:bg-arx-primary-dark"
                  : "bg-arx-borders text-arx-inactive cursor-not-allowed"
              }`}
            >
              <span>Continue</span>
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </EnrollmentShell>
    </main>
  );
}
