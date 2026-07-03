import { useRef, useState, useEffect, useCallback } from "react";
import { Upload, X, Pipette } from "lucide-react";
import { cn } from "@/lib/utils";

type ColorTarget = "primary" | "primaryDark" | "primaryLight";

interface Props {
  onPickColor: (target: ColorTarget, hex: string) => void;
}

const TARGETS: { key: ColorTarget; label: string }[] = [
  { key: "primary", label: "Primary" },
  { key: "primaryDark", label: "Primary Dark" },
  { key: "primaryLight", label: "Primary Light" },
];

export default function ColorPalettePicker({ onPickColor }: Props) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [hoverColor, setHoverColor] = useState<string | null>(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });
  const [pendingTarget, setPendingTarget] = useState<ColorTarget | null>(null);
  const [recentColors, setRecentColors] = useState<string[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setPendingTarget("primary");
    e.target.value = "";
  }

  useEffect(() => {
    if (!imageUrl || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0);
      imgRef.current = img;
    };
    img.src = imageUrl;
  }, [imageUrl]);

  const getColorAt = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    const [r, g, b] = ctx.getImageData(x, y, 1, 1).data;
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  }, []);

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const color = getColorAt(e);
    if (color) {
      setHoverColor(color);
      setHoverPos({ x: e.clientX, y: e.clientY });
    }
  }

  function handleClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const color = getColorAt(e);
    if (!color || !pendingTarget) return;
    onPickColor(pendingTarget, color);
    setRecentColors(prev => [color, ...prev.filter(c => c !== color)].slice(0, 12));
    // Advance to next target automatically
    const currentIdx = TARGETS.findIndex(t => t.key === pendingTarget);
    const next = TARGETS[currentIdx + 1];
    setPendingTarget(next ? next.key : null);
  }

  function handleMouseLeave() {
    setHoverColor(null);
  }

  return (
    <div className="mt-4 border border-dashed border-[--arx-borders] rounded-xl p-4 bg-gray-50/50 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-[--arx-slate] flex items-center gap-2">
          <Pipette size={14} />
          Upload Color Palette
        </p>
        {imageUrl && (
          <button
            onClick={() => { setImageUrl(null); setHoverColor(null); setPendingTarget(null); }}
            className="text-xs text-[--arx-inactive] hover:text-red-500 flex items-center gap-1 transition-colors"
          >
            <X size={12} />
            Clear
          </button>
        )}
      </div>

      {!imageUrl ? (
        <button
          onClick={() => fileRef.current?.click()}
          className="w-full flex flex-col items-center justify-center gap-2 py-6 border-2 border-dashed border-[--arx-borders] rounded-lg hover:border-[hsl(var(--arx-primary))] hover:bg-white transition-colors text-[--arx-inactive] hover:text-[hsl(var(--arx-primary))]"
        >
          <Upload size={20} />
          <span className="text-sm">Click to upload a color palette image</span>
          <span className="text-xs">PNG, JPG, SVG supported</span>
        </button>
      ) : (
        <div className="space-y-3">
          {/* Instruction */}
          {pendingTarget && (
            <div className="flex items-center gap-2 px-3 py-2 bg-[hsl(var(--arx-primary))]/10 text-[hsl(var(--arx-primary))] rounded-lg text-sm font-medium">
              <Pipette size={14} />
              Click a color to set <strong className="ml-1">{TARGETS.find(t => t.key === pendingTarget)?.label}</strong>
            </div>
          )}
          {!pendingTarget && (
            <p className="text-xs text-[--arx-body-copy]">All colors assigned. Click any color below to re-assign.</p>
          )}

          {/* Target buttons */}
          <div className="flex gap-2">
            {TARGETS.map(t => (
              <button
                key={t.key}
                onClick={() => setPendingTarget(t.key)}
                className={cn(
                  "px-3 py-1.5 text-xs rounded-lg border transition-all font-medium",
                  pendingTarget === t.key
                    ? "border-[hsl(var(--arx-primary))] bg-[hsl(var(--arx-primary))] text-white"
                    : "border-[--arx-borders] text-[--arx-body-copy] hover:border-[hsl(var(--arx-primary))] hover:text-[hsl(var(--arx-primary))]"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Canvas */}
          <div className="relative rounded-lg overflow-hidden border border-[--arx-borders]">
            <canvas
              ref={canvasRef}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              onClick={handleClick}
              className={cn(
                "w-full block",
                pendingTarget ? "cursor-crosshair" : "cursor-default"
              )}
              style={{ maxHeight: 220, objectFit: "contain" }}
            />
            {/* Color tooltip */}
            {hoverColor && (
              <div
                className="fixed z-50 pointer-events-none flex items-center gap-2 bg-white border border-[--arx-borders] shadow-lg rounded-lg px-3 py-1.5 text-sm font-mono"
                style={{ left: hoverPos.x + 16, top: hoverPos.y - 36 }}
              >
                <span className="w-4 h-4 rounded border border-[--arx-borders]" style={{ background: hoverColor }} />
                {hoverColor}
              </div>
            )}
          </div>

          {/* Recent colors */}
          {recentColors.length > 0 && (
            <div>
              <p className="text-xs text-[--arx-inactive] mb-1.5">Picked colors — click to reassign</p>
              <div className="flex flex-wrap gap-2">
                {recentColors.map(color => (
                  <div key={color} className="group relative">
                    <button
                      style={{ background: color }}
                      className="w-8 h-8 rounded-md border-2 border-white shadow-sm hover:scale-110 transition-transform"
                      title={color}
                      onClick={() => pendingTarget && onPickColor(pendingTarget, color)}
                    />
                    <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-xs font-mono text-[--arx-body-copy] opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none">{color}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
}
