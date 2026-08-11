/**
 * Toast — tiny local toast for the Rules portal's cheap no-op buttons
 * (Clone Program, Validate This Program, Reports/Dashboards/Error Logs
 * tabs, Publish Event, Call Apex, etc.). Not shared with any other portal —
 * this portal is self-contained per README.md's convention.
 */
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

interface ToastCtx {
  show: (message: string) => void;
}

const Ctx = createContext<ToastCtx | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((m: string) => {
    setMessage(m);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setMessage(null), 2200);
  }, []);

  return (
    <Ctx.Provider value={{ show }}>
      {children}
      {message && (
        <div className="fixed bottom-5 right-5 z-[999] bg-[#032d60] text-white text-[13px] px-4 py-2.5 rounded shadow-lg max-w-xs">
          {message}
        </div>
      )}
    </Ctx.Provider>
  );
}

export function useToast(): (message: string) => void {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx.show;
}
