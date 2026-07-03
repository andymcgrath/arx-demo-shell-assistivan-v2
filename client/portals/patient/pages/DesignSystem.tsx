import { useEffect, useRef, useState } from "react";
import { ArxButton } from "@/components/design-system/ArxButton";
import {
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ChevronLeft,
  Plus,
  Minus,
  Info,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────
   NAVIGATION STRUCTURE
───────────────────────────────────────────── */
const NAV = [
  {
    category: "Foundation",
    items: [
      { id: "colors", label: "Colors" },
      { id: "typography", label: "Typography" },
    ],
  },
  {
    category: "Layout",
    items: [
      { id: "headers", label: "Headers" },
      { id: "footers", label: "Footers" },
      { id: "left-section", label: "Left Section" },
      { id: "banners", label: "Banners" },
      { id: "isi-footer", label: "ISI Footer" },
    ],
  },
  {
    category: "Components",
    items: [
      { id: "buttons", label: "Buttons" },
      { id: "form-inputs", label: "Form Inputs" },
      { id: "radios-checkboxes", label: "Radios & Checkboxes" },
      { id: "dropdowns", label: "Dropdowns" },
      { id: "agreement-boxes", label: "Agreement Boxes" },
      { id: "step-indicators", label: "Step Indicators" },
      { id: "isi-box", label: "ISI Box" },
      { id: "modals", label: "Modals" },
      { id: "snackbars", label: "Snackbars" },
      { id: "grey-box", label: "Grey Box" },
    ],
  },
  {
    category: "Patterns",
    items: [
      { id: "upload-cards", label: "Upload Cards" },
      { id: "signature-boxes", label: "Signature Boxes" },
      { id: "photo-collages", label: "Photo Collages" },
    ],
  },
];

/* ─────────────────────────────────────────────
   SCROLL SPY HOOK
───────────────────────────────────────────── */
function useScrollSpy(ids: string[]) {
  const [activeId, setActiveId] = useState<string>(ids[0]);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveId(id);
        },
        { rootMargin: "-20% 0px -70% 0px", threshold: 0 }
      );
      obs.observe(el);
      observers.push(obs);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, [ids]);

  return activeId;
}

/* ─────────────────────────────────────────────
   SECTION WRAPPER
───────────────────────────────────────────── */
function Section({
  id,
  title,
  category,
  description,
  children,
}: {
  id: string;
  title: string;
  category: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20 mb-20">
      <p className="text-xs font-semibold uppercase tracking-widest text-arx-primary mb-1">
        {category}
      </p>
      <h2 className="text-4xl font-light text-arx-slate mb-3">{title}</h2>
      {description && (
        <p className="text-arx-body-copy text-base leading-relaxed mb-6 max-w-2xl">
          {description}
        </p>
      )}
      <div className="h-px bg-arx-borders mb-8" />
      {children}
    </section>
  );
}

/* ─────────────────────────────────────────────
   COLOR SWATCH
───────────────────────────────────────────── */
function ColorSwatch({
  name,
  hex,
  className,
  textClass = "text-white",
}: {
  name: string;
  hex: string;
  className: string;
  textClass?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className={cn("w-full h-16 rounded-lg shadow-sm", className)} />
      <div>
        <p className="text-sm font-semibold text-arx-slate">{name}</p>
        <p className="text-xs text-arx-body-copy font-mono">{hex}</p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   DEMO CARD (wrapper for inline demos)
───────────────────────────────────────────── */
function DemoCard({
  label,
  children,
  className,
}: {
  label?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {label && (
        <p className="text-xs font-semibold text-arx-body-copy uppercase tracking-wide">
          {label}
        </p>
      )}
      <div className="border border-arx-borders rounded-xl p-6 bg-white">
        {children}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   DESKTOP HEADER COMPONENT
───────────────────────────────────────────── */
function DesktopHeader() {
  return (
    <header className="bg-white border-b border-arx-borders">
      <div className="px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-[150px] h-[50px] border border-dashed border-arx-inactive rounded flex items-center justify-center text-arx-inactive text-xs">
            Drug Logo
          </div>
          <div className="w-px h-12 bg-arx-inactive/40" />
          <div className="w-[100px] h-[50px] border border-dashed border-arx-inactive rounded flex items-center justify-center text-arx-inactive text-xs">
            AssistRx
          </div>
        </div>
        <nav className="flex items-center gap-6">
          <a href="#" className="text-arx-primary font-semibold text-sm hover:underline">
            Important Safety Information
          </a>
          <a href="#" className="text-arx-primary font-semibold text-sm hover:underline">
            Prescribing Information
          </a>
        </nav>
      </div>
    </header>
  );
}

function TabletHeader() {
  return (
    <header className="bg-arx-primary">
      <div className="px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-[100px] h-[45px] border border-dashed border-white/50 rounded flex items-center justify-center text-white text-xs">
            Drug Logo
          </div>
          <div className="w-px h-10 bg-white/30" />
          <div className="w-[70px] h-[35px] border border-dashed border-white/50 rounded flex items-center justify-center text-white text-xs">
            AssistRx
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="w-6 h-0.5 bg-white" />
          <div className="w-6 h-0.5 bg-white" />
          <div className="w-6 h-0.5 bg-white" />
        </div>
      </div>
    </header>
  );
}

function MobileHeader() {
  return (
    <header className="bg-arx-primary">
      <div className="px-4 py-4 flex items-center justify-between">
        <div className="w-[90px] h-[36px] border border-dashed border-white/50 rounded flex items-center justify-center text-white text-xs">
          Drug Logo
        </div>
        <div className="flex flex-col gap-1">
          <div className="w-5 h-0.5 bg-white" />
          <div className="w-5 h-0.5 bg-white" />
          <div className="w-5 h-0.5 bg-white" />
        </div>
      </div>
    </header>
  );
}

/* ─────────────────────────────────────────────
   FOOTER COMPONENTS
───────────────────────────────────────────── */
function DesktopFooter() {
  return (
    <footer className="bg-white shadow-[0_-3px_14px_0_rgba(0,0,0,0.15)]">
      <div className="px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-[130px] h-[48px] border border-dashed border-arx-inactive rounded flex items-center justify-center text-arx-inactive text-xs">
            Drug Logo
          </div>
          <div className="w-px h-10 bg-arx-inactive/30" />
          <div className="w-[90px] h-[44px] border border-dashed border-arx-inactive rounded flex items-center justify-center text-arx-inactive text-xs">
            AssistRx
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-2 text-xs">
            <a href="#" className="text-arx-primary font-bold hover:underline">Privacy Policy</a>
            <span className="text-arx-body-copy">|</span>
            <a href="#" className="text-arx-primary font-bold hover:underline">Terms of Use</a>
          </div>
          <p className="text-arx-inactive text-xs font-bold">
            ©2025 AssistRx. All Rights Reserved. Intended for US residents only.
          </p>
        </div>
      </div>
    </footer>
  );
}

function TealFooter() {
  return (
    <footer className="bg-arx-primary">
      <div className="px-8 py-8 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="w-[100px] h-[44px] border border-dashed border-white/50 rounded flex items-center justify-center text-white text-xs">
            Drug Logo
          </div>
          <div className="w-px h-10 bg-white/30" />
          <div className="w-[70px] h-[32px] border border-dashed border-white/50 rounded flex items-center justify-center text-white text-xs">
            AssistRx
          </div>
        </div>
        <p className="text-white/90 text-xs font-bold leading-relaxed max-w-sm">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
        </p>
        <div className="flex items-center gap-2 text-xs">
          <a href="#" className="text-white font-bold underline">Privacy Policy</a>
          <span className="text-white/60">|</span>
          <a href="#" className="text-white font-bold underline">Terms of Use</a>
        </div>
        <p className="text-white/70 text-xs font-bold">©2025 AssistRx. All Rights Reserved. Intended for US residents only.</p>
        <p className="text-arx-sky text-xs font-bold">Powered by AssistRx</p>
      </div>
    </footer>
  );
}

/* ─────────────────────────────────────────────
   LEFT SECTION COMPONENT
───────────────────────────────────────────── */
function LeftSection({ type = "landing" }: { type?: "landing" | "steps" | "confirmation" }) {
  return (
    <div className="flex flex-col gap-6 max-w-[480px]">
      {type === "steps" && (
        <ArxButton variant="tertiary" showLeftArrow>Previous Step</ArxButton>
      )}
      {type === "steps" && (
        <div className="flex flex-col gap-2">
          <span className="text-arx-body-copy font-bold text-sm uppercase tracking-wide">Step 1 / 7</span>
          <div className="w-full h-2.5 bg-[#D9D9D9] rounded">
            <div className="h-2.5 bg-arx-primary rounded w-[43px]" />
          </div>
        </div>
      )}
      <h1 className="text-arx-slate font-bold text-[32px] leading-[130%]">
        {type === "landing" ? "Welcome!" : type === "steps" ? "Step Title Goes Here" : "Confirmation"}
      </h1>
      <p className="text-arx-body-copy font-semibold text-base leading-[160%]">
        {type === "landing"
          ? "We assist patients and caregivers with capturing secure consent and authorization for medications prescribed by their doctors."
          : "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."}
      </p>
      {type === "landing" && (
        <div className="flex flex-col gap-5">
          <ArxButton variant="link-arrow" showRightArrow>I am a Patient/Caregiver</ArxButton>
          <ArxButton variant="link-arrow" showRightArrow>I am a Healthcare Provider</ArxButton>
        </div>
      )}
      {type === "confirmation" && (
        <div className="flex flex-col gap-4">
          <ArxButton variant="link-arrow" showRightArrow>Check Another Patient Coverage</ArxButton>
          <ArxButton variant="link-arrow" showRightArrow>Register with iAssist</ArxButton>
        </div>
      )}
      <div className="w-full h-px bg-arx-borders" />
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-arx-slate font-bold text-sm">Need Assistance?</span>
          <Info className="w-3.5 h-3.5 text-arx-body-copy" />
        </div>
        <p className="text-arx-body-copy text-sm">Contact Customer Support at 877-450-4412</p>
      </div>
      <ArxButton variant="link-arrow" showUpArrow>Important Safety Information</ArxButton>
    </div>
  );
}

/* ─────────────────────────────────────────────
   ISI BOX
───────────────────────────────────────────── */
function ISIBox() {
  return (
    <div className="relative max-w-[560px] h-80 border border-arx-inactive rounded overflow-hidden">
      <div className="absolute inset-0 overflow-y-auto pr-3 p-3">
        <p className="text-arx-primary font-bold text-sm">IMPORTANT SAFETY INFORMATION WARNINGS AND PRECAUTIONS</p>
        <p className="text-arx-primary font-bold text-sm mt-2">Vulnerability:</p>
        <p className="text-arx-body-copy text-sm leading-relaxed mt-1">
          • Lorem ipsum dolor sit amet, consectetur adipiscing elit. Massa scelerisque volutpat gravida mauris nunc sem tincidunt. Id nisi, sem eget in.
        </p>
        <p className="text-arx-body-copy text-sm leading-relaxed mt-2">
          • Lorem ipsum dolor sit amet, consectetur adipiscing elit. Massa scelerisque volutpat gravida mauris nunc sem tincidunt. Id nisi, sem eget in. Lorem ipsum dolor sit amet, consectetur adipiscing elit.
        </p>
        <p className="text-arx-body-copy text-sm leading-relaxed mt-2">
          • Additional safety information lorem ipsum dolor sit amet, consectetur adipiscing elit. Nec amet morbi mauris sollicitudin.
        </p>
      </div>
      <div className="absolute right-0 top-0 bottom-0 w-3 bg-arx-borders rounded-r flex flex-col justify-between py-1">
        <ChevronUp className="w-2 h-2 text-arx-body-copy mx-auto" />
        <div className="w-3 h-12 bg-arx-inactive rounded" />
        <ChevronDown className="w-2 h-2 text-arx-body-copy mx-auto" />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   AGREEMENT BOX
───────────────────────────────────────────── */
function AgreementBox({
  label = "Patient Consent",
  optional = false,
  requiresScroll = false,
}: {
  label?: string;
  optional?: boolean;
  requiresScroll?: boolean;
}) {
  const [checked, setChecked] = useState(false);
  const [scrolled, setScrolled] = useState(!requiresScroll);

  return (
    <div className="border border-arx-inactive rounded p-4 w-72">
      <div className="flex items-center justify-between mb-2">
        <span className="text-arx-slate font-semibold text-sm">{label}</span>
        {optional && <span className="text-arx-optional text-xs font-semibold">Optional</span>}
      </div>
      <div
        className="h-28 overflow-y-auto text-xs text-arx-body-copy leading-relaxed mb-2 pr-1"
        onScroll={(e) => {
          const el = e.currentTarget;
          if (el.scrollTop + el.clientHeight >= el.scrollHeight - 5) setScrolled(true);
        }}
      >
        <p>
          Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.
        </p>
      </div>
      {requiresScroll && !scrolled && (
        <p className="text-arx-errors text-xs mb-2">Scroll to the bottom of consent in order to agree.</p>
      )}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => scrolled && setChecked(e.target.checked)}
          disabled={requiresScroll && !scrolled}
          className="w-4 h-4 accent-arx-primary"
        />
        <span className="text-xs text-arx-body-copy">I agree</span>
      </label>
    </div>
  );
}

/* ─────────────────────────────────────────────
   FORM INPUT
───────────────────────────────────────────── */
function FormInput({
  label,
  placeholder = "",
  error = false,
  errorMsg = "Error message",
  optional = false,
  type = "text",
}: {
  label: string;
  placeholder?: string;
  error?: boolean;
  errorMsg?: string;
  optional?: boolean;
  type?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <label className={cn("text-sm font-semibold", error ? "text-arx-errors" : "text-arx-slate")}>
          {label}
        </label>
        {optional && <span className="text-arx-optional text-xs font-semibold">Optional</span>}
      </div>
      <input
        type={type}
        placeholder={placeholder}
        className={cn(
          "h-10 px-3 text-sm border rounded transition-colors outline-none focus:ring-2 focus:ring-arx-primary",
          error ? "border-arx-errors focus:ring-arx-errors" : "border-arx-borders focus:border-arx-primary"
        )}
      />
      {error && <p className="text-arx-errors text-xs">{errorMsg}</p>}
    </div>
  );
}

/* ─────────────────────────────────────────────
   STEPPER / PROGRESS
───────────────────────────────────────────── */
function Stepper({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  const progress = (currentStep / totalSteps) * 100;
  return (
    <div className="flex flex-col gap-2 max-w-sm">
      <span className="text-arx-body-copy font-bold text-sm uppercase tracking-wide">Step {currentStep} / {totalSteps}</span>
      <div className="w-full h-2.5 bg-[#D9D9D9] rounded overflow-hidden">
        <div className="h-full bg-arx-primary rounded transition-all" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

function DotStepper({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-arx-slate font-bold text-sm uppercase tracking-wide">Step {currentStep} / {totalSteps}</span>
      <div className="flex items-center gap-2.5">
        {Array.from({ length: totalSteps }, (_, i) => (
          <div
            key={i}
            className={cn("w-2.5 h-2.5 rounded-full", i < currentStep ? "bg-arx-primary" : "bg-[#C4C4C4]")}
          />
        ))}
      </div>
    </div>
  );
}

function Pagination() {
  const [active, setActive] = useState(1);
  return (
    <div className="flex items-center gap-3">
      {[1, 2, 3].map((page) => (
        <button
          key={page}
          onClick={() => setActive(page)}
          className={cn(
            "w-8 h-8 rounded border text-sm font-semibold transition-colors",
            active === page ? "border-arx-primary text-arx-primary" : "border-arx-borders text-arx-inactive"
          )}
        >
          {page}
        </button>
      ))}
      <button className="w-8 h-8 rounded border border-arx-slate flex items-center justify-center">
        <ChevronRight className="w-4 h-4 text-arx-slate" />
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────
   SNACKBAR
───────────────────────────────────────────── */
function Snackbar({ type = "success", message }: { type?: "success" | "error" | "warning"; message: string }) {
  const styles = {
    success: "bg-arx-primary text-white",
    error: "bg-arx-errors text-white",
    warning: "bg-arx-orange text-white",
  };
  const labels = { success: "Success", error: "Error", warning: "Warning" };

  return (
    <div className={cn("flex items-center gap-3 px-5 py-3.5 rounded-lg text-sm font-semibold", styles[type])}>
      <span className="text-xs font-bold uppercase tracking-wide opacity-80">{labels[type]}:</span>
      {message}
    </div>
  );
}

/* ─────────────────────────────────────────────
   GREY BOX
───────────────────────────────────────────── */
function GreyBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-arx-neutral-100 border border-arx-borders rounded-lg p-4 text-arx-slate text-sm leading-relaxed">
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────
   MODAL
───────────────────────────────────────────── */
function ModalPreview() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <ArxButton onClick={() => setOpen(true)} variant="outline" size="desktop" className="w-auto px-8">
        Open Modal
      </ArxButton>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6 flex flex-col gap-5">
            <div className="flex items-start justify-between">
              <h3 className="text-arx-slate font-bold text-xl">Confirm Action</h3>
              <button onClick={() => setOpen(false)} className="text-arx-body-copy hover:text-arx-slate text-lg leading-none">
                ✕
              </button>
            </div>
            <p className="text-arx-body-copy text-sm leading-relaxed">
              Are you sure you want to proceed? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-4">
              <ArxButton variant="outline" size="desktop" className="w-auto px-6 h-11" onClick={() => setOpen(false)}>
                Cancel
              </ArxButton>
              <ArxButton variant="primary" size="desktop" className="w-auto px-6 h-11" onClick={() => setOpen(false)}>
                Confirm
              </ArxButton>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ─────────────────────────────────────────────
   UPLOAD CARD
───────────────────────────────────────────── */
function UploadCard() {
  return (
    <div className="border-2 border-dashed border-arx-borders rounded-lg p-8 flex flex-col items-center gap-3 w-56 text-center hover:border-arx-primary transition-colors cursor-pointer">
      <div className="w-12 h-12 rounded-full bg-arx-neutral-100 flex items-center justify-center">
        <Plus className="w-6 h-6 text-arx-primary" />
      </div>
      <p className="text-arx-slate font-semibold text-sm">Upload Document</p>
      <p className="text-arx-body-copy text-xs">Drag & drop or click to upload. PDF, JPG, PNG accepted.</p>
    </div>
  );
}

/* ─────────────────────────────────────────────
   SIGNATURE BOX
───────────────────────────────────────────── */
function SigBox() {
  return (
    <div className="border border-arx-borders rounded-lg overflow-hidden w-72">
      <div className="bg-arx-neutral-100 px-4 py-2 text-xs font-semibold text-arx-body-copy uppercase tracking-wide border-b border-arx-borders">
        Signature
      </div>
      <div className="h-24 bg-white flex items-center justify-center text-arx-inactive text-sm italic">
        Sign here
      </div>
      <div className="px-4 py-2 flex items-center justify-between border-t border-arx-borders">
        <span className="text-xs text-arx-links cursor-pointer hover:underline">Clear</span>
        <ArxButton variant="primary" size="desktop" className="w-auto px-4 h-8 text-xs">
          Accept
        </ArxButton>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   ISI FOOTER PREVIEW (embedded, not fixed)
───────────────────────────────────────────── */
function ISIFooterPreview() {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-arx-borders rounded-lg overflow-hidden shadow-md">
      <div className="bg-white">
        <div className="px-6 py-2 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="text-arx-primary font-bold text-sm">Indications</span>
            <div className="w-px h-4 bg-arx-borders" />
            <span className="text-arx-primary font-bold text-sm">Important Safety Information</span>
          </div>
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-2 text-arx-primary text-xs font-semibold"
          >
            {open ? <><Minus className="w-4 h-4" /> Collapse</> : <><Plus className="w-4 h-4" /> Expand</>}
          </button>
        </div>
      </div>
      {open && (
        <div className="bg-white border-t border-arx-borders">
          <div className="px-6 py-4 grid grid-cols-2 gap-8">
            <div>
              <h4 className="text-arx-primary font-bold text-sm mb-2">Indications</h4>
              <p className="text-arx-slate text-xs font-semibold leading-relaxed">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nec, amet morbi mauris sollicitudin. Ut tellus faucibus viverra pharetra turpis.
              </p>
            </div>
            <div>
              <h4 className="text-arx-primary font-bold text-sm mb-2">Important Safety Information</h4>
              <p className="text-arx-slate text-xs font-semibold leading-relaxed">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nec, amet morbi mauris sollicitudin. Ut tellus faucibus viverra pharetra turpis.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   PHOTO COLLAGE OPTION A
───────────────────────────────────────────── */
function PhotoCollageA() {
  return (
    <div className="relative w-80 h-64">
      {/* decorative circles */}
      <div className="absolute bottom-4 left-12 w-20 h-20 rounded-full border-2 border-arx-sky opacity-60" />
      <div className="absolute bottom-2 right-4 w-14 h-14 rounded-full bg-yellow-200 opacity-60" />
      {/* images */}
      <div className="absolute top-0 left-16 w-36 h-24 rounded-md bg-arx-sky/30 border border-arx-sky flex items-center justify-center text-xs text-arx-body-copy">
        Photo 1
      </div>
      <div className="absolute top-0 right-0 w-40 h-44 rounded-full border-4 border-arx-sky bg-arx-primary-30/30 flex items-center justify-center text-xs text-arx-body-copy overflow-hidden">
        Photo 2 (circle)
      </div>
      <div className="absolute top-28 left-0 w-36 h-24 rounded-md bg-arx-sky/30 border border-arx-sky flex items-center justify-center text-xs text-arx-body-copy">
        Photo 3
      </div>
      <div className="absolute bottom-0 left-24 w-28 h-20 rounded-md bg-arx-sky/20 border border-arx-sky flex items-center justify-center text-xs text-arx-body-copy">
        Photo 4
      </div>
    </div>
  );
}

function PhotoCollageB() {
  return (
    <div className="relative w-72 h-56">
      <div className="absolute top-2 right-4 w-16 h-16 rounded-full border-2 border-arx-sky opacity-50" />
      <div className="absolute bottom-0 right-8 w-12 h-12 rounded-full bg-yellow-200 opacity-60" />
      <div className="absolute top-0 right-0 w-44 h-32 rounded-md bg-arx-sky/30 border border-arx-sky flex items-center justify-center text-xs text-arx-body-copy">
        Photo 1
      </div>
      <div className="absolute bottom-0 left-0 w-36 h-28 rounded-md bg-arx-sky/20 border border-arx-sky flex items-center justify-center text-xs text-arx-body-copy">
        Photo 2
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   SIDEBAR NAVIGATION
───────────────────────────────────────────── */
function Sidebar({ activeId, onClose }: { activeId: string; onClose?: () => void }) {
  return (
    <nav className="h-full overflow-y-auto py-6 px-4">
      {NAV.map((group) => (
        <div key={group.category} className="mb-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-arx-inactive mb-2 px-2">
            {group.category}
          </p>
          <ul className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const isActive = activeId === item.id;
              return (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    onClick={onClose}
                    className={cn(
                      "flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                      "border-l-2",
                      isActive
                        ? "border-arx-primary text-arx-primary bg-arx-primary/5 font-semibold"
                        : "border-transparent text-arx-body-copy hover:text-arx-slate hover:bg-arx-neutral-100"
                    )}
                  >
                    {item.label}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/* ─────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────── */
export default function DesignSystem() {
  const allIds = NAV.flatMap((g) => g.items.map((i) => i.id));
  const activeId = useScrollSpy(allIds);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#FAFAFA]">

      {/* ── Fixed Top Header ── */}
      <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-arx-primary flex items-center justify-between px-6 shadow-lg">
        <div className="flex items-center gap-3">
          <button
            className="lg:hidden text-white mr-2"
            onClick={() => setMobileSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex flex-col">
            <span className="text-white font-bold text-base leading-tight">iAssist Design System</span>
            <span className="text-arx-sky text-xs font-medium">AssistRx · Component Library</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="bg-white/20 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
            v1.0
          </span>
          <span className="text-white/60 text-xs hidden sm:block">2025</span>
        </div>
      </header>

      {/* ── Mobile sidebar overlay ── */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-[60] flex">
          <div className="bg-black/40 flex-1" onClick={() => setMobileSidebarOpen(false)} />
          <div className="w-64 bg-white h-full shadow-xl overflow-y-auto">
            <div className="flex items-center justify-between px-4 py-4 border-b border-arx-borders">
              <span className="font-bold text-arx-slate text-sm">Navigation</span>
              <button onClick={() => setMobileSidebarOpen(false)}>
                <X className="w-5 h-5 text-arx-body-copy" />
              </button>
            </div>
            <Sidebar activeId={activeId} onClose={() => setMobileSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* ── Fixed Left Sidebar (desktop) ── */}
      <aside className="hidden lg:flex fixed left-0 top-16 bottom-0 w-56 bg-white border-r border-arx-borders flex-col z-40">
        <Sidebar activeId={activeId} />
      </aside>

      {/* ── Main Content ── */}
      <main className="pt-16 lg:pl-56">
        <div className="max-w-5xl mx-auto px-6 lg:px-10 py-12">

          {/* ══════════════════════════════════
              SECTION: COLORS
          ══════════════════════════════════ */}
          <Section
            id="colors"
            title="Colors"
            category="Foundation"
            description="The AssistRx / iAssist brand palette. Primary Teal (#007178) is the dominant brand color used across CTAs, headings, and key UI elements. Always check ADA contrast compliance before use."
          >
            <div className="flex flex-col gap-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-arx-body-copy mb-3">Brand</p>
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-4">
                  <ColorSwatch name="Primary Teal" hex="#007178" className="bg-arx-primary" />
                  <ColorSwatch name="Primary 80%" hex="#338D93" className="bg-arx-primary-80" />
                  <ColorSwatch name="Primary 30%" hex="#B3D4D7" className="bg-arx-primary-30" textClass="text-arx-slate" />
                  <ColorSwatch name="Secondary Sea" hex="#297896" className="bg-arx-secondary" />
                  <ColorSwatch name="Sky / Tertiary" hex="#ADE2E3" className="bg-arx-sky" textClass="text-arx-slate" />
                  <ColorSwatch name="Optional" hex="#574B90" className="bg-arx-optional" />
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-arx-body-copy mb-3">Neutrals</p>
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-4">
                  <ColorSwatch name="Slate" hex="#414042" className="bg-arx-slate" />
                  <ColorSwatch name="Body Copy" hex="#6F7276" className="bg-arx-body-copy" />
                  <ColorSwatch name="Inactive" hex="#ACACAC" className="bg-arx-inactive" />
                  <ColorSwatch name="Borders" hex="#E0E0E0" className="bg-arx-borders" textClass="text-arx-slate" />
                  <ColorSwatch name="Background" hex="#F2F2F2" className="bg-arx-background border border-arx-borders" textClass="text-arx-slate" />
                  <ColorSwatch name="White" hex="#FFFFFF" className="bg-white border border-arx-borders" textClass="text-arx-slate" />
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-arx-body-copy mb-3">Functional</p>
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-4">
                  <ColorSwatch name="Errors" hex="#DB1616" className="bg-arx-errors" />
                  <ColorSwatch name="Orange / Warning" hex="#EF8A13" className="bg-arx-orange" />
                  <ColorSwatch name="Links" hex="#2171B8" className="bg-arx-links" />
                  <ColorSwatch name="Neutral 100" hex="#F8F8F8" className="bg-arx-neutral-100 border border-arx-borders" textClass="text-arx-slate" />
                </div>
              </div>
            </div>
          </Section>

          {/* ══════════════════════════════════
              SECTION: TYPOGRAPHY
          ══════════════════════════════════ */}
          <Section
            id="typography"
            title="Typography"
            category="Foundation"
            description="Open Sans is the primary typeface across all AssistRx / iAssist products. Use the scale below for consistent hierarchy."
          >
            <div className="flex flex-col divide-y divide-arx-borders">
              {[
                { label: "H1 — 40px Bold · #414042", sample: "Welcome!", className: "text-arx-slate font-bold text-[40px] leading-[130%]" },
                { label: "H2 — 30px Bold · #414042", sample: "Step Title Goes Here", className: "text-arx-slate font-bold text-[30px] leading-[130%]" },
                { label: "Body Large — 20px SemiBold · #6F7276", sample: "We assist patients and caregivers with capturing secure consent and authorization for medications prescribed by their doctors.", className: "text-arx-body-copy font-semibold text-xl leading-[160%]" },
                { label: "Body — 16px Regular · #6F7276", sample: "Contact Customer Support at 877-450-4412", className: "text-arx-body-copy text-base leading-[140%]" },
                { label: "Label — 16px Bold · #414042", sample: "Need Assistance?", className: "text-arx-slate font-bold text-base" },
                { label: "Small / Legal — 12px Bold · #ACACAC", sample: "©2025 AssistRx. All Rights Reserved. Intended for US residents only.", className: "text-arx-inactive font-bold text-xs" },
              ].map(({ label, sample, className }) => (
                <div key={label} className="py-5 flex flex-col gap-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-arx-inactive">{label}</p>
                  <p className={className}>{sample}</p>
                </div>
              ))}
            </div>
          </Section>

          {/* ══════════════════════════════════
              SECTION: HEADERS
          ══════════════════════════════════ */}
          <Section
            id="headers"
            title="Headers"
            category="Layout"
            description="Three header variants covering Desktop, Tablet, and Mobile breakpoints. Desktop uses a white bar with dual logos and nav links. Tablet/Mobile use a teal bar with a hamburger menu."
          >
            <div className="flex flex-col gap-8">
              <DemoCard label="Desktop — White Bar">
                <DesktopHeader />
              </DemoCard>
              <DemoCard label="Tablet — Teal Bar">
                <TabletHeader />
              </DemoCard>
              <DemoCard label="Mobile — Teal Bar">
                <MobileHeader />
              </DemoCard>
            </div>
          </Section>

          {/* ══════════════════════════════════
              SECTION: FOOTERS
          ══════════════════════════════════ */}
          <Section
            id="footers"
            title="Footers"
            category="Layout"
            description="Desktop uses a white footer with dual logos and legal links. Tablet and Mobile use a teal footer with legal disclaimer and 'Powered by AssistRx' attribution."
          >
            <div className="flex flex-col gap-8">
              <DemoCard label="Desktop — White Footer">
                <DesktopFooter />
              </DemoCard>
              <DemoCard label="Tablet / Mobile — Teal Footer">
                <div className="max-w-xs">
                  <TealFooter />
                </div>
              </DemoCard>
            </div>
          </Section>

          {/* ══════════════════════════════════
              SECTION: LEFT SECTION
          ══════════════════════════════════ */}
          <Section
            id="left-section"
            title="Left Section"
            category="Layout"
            description="The left panel of two-column layouts. Three states: Landing (welcome + arrow links), Step Page (with progress bar), and Confirmation. Max width 612px."
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <DemoCard label="Landing">
                <LeftSection type="landing" />
              </DemoCard>
              <DemoCard label="Step Page">
                <LeftSection type="steps" />
              </DemoCard>
              <DemoCard label="Confirmation">
                <LeftSection type="confirmation" />
              </DemoCard>
            </div>
          </Section>

          {/* ══════════════════════════════════
              SECTION: BANNERS
          ══════════════════════════════════ */}
          <Section
            id="banners"
            title="Banners"
            category="Layout"
            description="Full-width informational bars. The 'For US Healthcare Professionals Only' banner is a read-only announcement bar shown at the top of HCP-specific flows."
          >
            <div className="flex flex-col gap-4">
              <DemoCard label="HCP-Only Banner">
                <div className="bg-arx-primary-30 border border-arx-primary-80 text-arx-slate text-sm font-semibold px-5 py-3 text-center rounded">
                  For US Healthcare Professionals Only
                </div>
              </DemoCard>
              <DemoCard label="Info Banner">
                <div className="border-l-4 border-arx-secondary bg-arx-sky/20 px-5 py-3 rounded text-sm font-semibold text-arx-slate">
                  Informational message — for contextual notes and guidance to the user.
                </div>
              </DemoCard>
              <DemoCard label="Warning Banner">
                <div className="border-l-4 border-arx-orange bg-orange-50 px-5 py-3 rounded text-sm font-semibold text-arx-slate">
                  Warning — action required before continuing.
                </div>
              </DemoCard>
              <DemoCard label="Error Banner">
                <div className="border-l-4 border-arx-errors bg-red-50 px-5 py-3 rounded text-sm font-semibold text-arx-errors">
                  Error — something went wrong. Please try again.
                </div>
              </DemoCard>
            </div>
          </Section>

          {/* ══════════════════════════════════
              SECTION: ISI FOOTER
          ══════════════════════════════════ */}
          <Section
            id="isi-footer"
            title="ISI Footer"
            category="Layout"
            description="A sticky bar docked at the bottom of the viewport that shows ISI labels (Indications / Important Safety Information) with expand/collapse functionality. In production this is fixed; below is an interactive preview."
          >
            <ISIFooterPreview />
            <div className="mt-4 p-4 bg-arx-neutral-100 border border-arx-borders rounded-lg text-xs text-arx-body-copy leading-relaxed">
              <strong className="text-arx-slate">Usage note:</strong> In production, the ISI Footer is <code>position: fixed; bottom: 0</code> spanning full viewport width. It sits above any page content and requires a corresponding bottom padding on the page wrapper.
            </div>
          </Section>

          {/* ══════════════════════════════════
              SECTION: BUTTONS
          ══════════════════════════════════ */}
          <Section
            id="buttons"
            title="Buttons"
            category="Components"
            description="Use the appropriate variant before reaching for a blank button. Primary CTAs guide users through the core flow. Outline is used when two equal route options exist. Link+Arrow for secondary navigation. Tertiary/Back for backward navigation."
          >
            <div className="flex flex-col gap-8">

              <DemoCard label="Primary — Filled (Rounded & Pill)">
                <div className="flex flex-wrap items-center gap-4">
                  <ArxButton variant="primary" shape="rounded" size="desktop" className="w-auto px-8">Continue</ArxButton>
                  <ArxButton variant="primary" shape="pill" size="desktop" className="w-auto px-8">Next</ArxButton>
                  <ArxButton variant="primary" shape="rounded" size="desktop" className="w-auto px-8" disabled>Disabled</ArxButton>
                </div>
              </DemoCard>

              <DemoCard label="Outline — When 2 equal route options exist">
                <div className="flex flex-wrap items-center gap-4">
                  <ArxButton variant="outline" shape="rounded" size="desktop" className="w-auto px-8">I am a Patient/Caregiver</ArxButton>
                  <ArxButton variant="outline" shape="rounded" size="desktop" className="w-auto px-8">I am a Healthcare Provider</ArxButton>
                  <ArxButton variant="outline" shape="rounded" size="desktop" className="w-auto px-8" disabled>Disabled</ArxButton>
                </div>
                <p className="mt-4 text-xs text-arx-body-copy leading-relaxed border-t border-arx-borders pt-3">
                  <strong>Note:</strong> When there are 2 primary route selections, use Outline for both. The hover state fills with the primary color. Only use a single filled Primary button when you want to lead the user to click one route over another.
                </p>
              </DemoCard>

              <DemoCard label="Link + Arrow — Secondary navigation">
                <div className="flex flex-wrap items-center gap-8">
                  <ArxButton variant="link-arrow" showRightArrow>I am a Patient/Caregiver</ArxButton>
                  <ArxButton variant="link-arrow" showUpArrow>Important Safety Information</ArxButton>
                  <ArxButton variant="link">Email a copy?</ArxButton>
                </div>
              </DemoCard>

              <DemoCard label="Tertiary — Back / Previous Step">
                <ArxButton variant="tertiary" showLeftArrow>Previous Step</ArxButton>
              </DemoCard>

              <DemoCard label="Mobile — Full Width">
                <div className="max-w-xs flex flex-col gap-3">
                  <ArxButton variant="primary" size="mobile">Check Another Patient Coverage</ArxButton>
                  <ArxButton variant="outline" size="mobile">Register with iAssist</ArxButton>
                </div>
              </DemoCard>

              <div className="p-5 bg-orange-50 border-2 border-arx-orange rounded-xl">
                <p className="text-arx-slate font-bold text-base mb-3">Best Practices for Button Text</p>
                <div className="grid grid-cols-2 gap-4 text-sm text-arx-body-copy">
                  <div>
                    <p className="font-bold text-arx-slate mb-1">Do</p>
                    <ul className="list-disc list-inside space-y-0.5">
                      <li>Start with a verb</li>
                      <li>Be specific about the action</li>
                      <li>Match the user's intent</li>
                    </ul>
                    <p className="font-semibold text-arx-slate mt-2 mb-1">Good examples</p>
                    <p className="text-arx-primary">Continue · Submit · Save · Upload File · Confirm</p>
                  </div>
                  <div>
                    <p className="font-bold text-arx-slate mb-1">Avoid</p>
                    <ul className="list-disc list-inside space-y-0.5">
                      <li>Full sentences</li>
                      <li>Vague wording</li>
                      <li>Internal or technical terms</li>
                    </ul>
                    <p className="font-semibold text-arx-slate mt-2 mb-1">Avoid examples</p>
                    <p className="text-arx-errors">Click Here · Yes · OK · Submit Your Information to the System</p>
                  </div>
                </div>
              </div>
            </div>
          </Section>

          {/* ══════════════════════════════════
              SECTION: FORM INPUTS
          ══════════════════════════════════ */}
          <Section
            id="form-inputs"
            title="Form Inputs"
            category="Components"
            description="Text fields, date pickers, and associated states (default, filled, optional, error). Height is 40px; border-radius 4px. Error state uses red border and label."
          >
            <div className="flex flex-col gap-6">
              <DemoCard label="Text Inputs">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  <FormInput label="Input Title" placeholder="Enter value" />
                  <FormInput label="Input Title" placeholder="Filled value" />
                  <FormInput label="Input Title" placeholder="Enter value" optional />
                  <FormInput label="Input Title" placeholder="Enter value" error errorMsg="Error message" />
                  <FormInput label="Date of Birth" placeholder="MM/DD/YYYY" type="date" />
                </div>
              </DemoCard>
            </div>
          </Section>

          {/* ══════════════════════════════════
              SECTION: RADIOS & CHECKBOXES
          ══════════════════════════════════ */}
          <Section
            id="radios-checkboxes"
            title="Radios & Checkboxes"
            category="Components"
            description="Selection controls using the primary teal accent color. Radio buttons are 24px; checkboxes are 18px. Error state turns the control red."
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <DemoCard label="Radio Buttons">
                <div className="flex flex-col gap-3">
                  {[
                    { label: "Yes", checked: true },
                    { label: "No", checked: false },
                  ].map(({ label, checked }) => (
                    <label key={label} className="flex items-center gap-3 cursor-pointer">
                      <input type="radio" name="radio-demo" defaultChecked={checked} className="w-5 h-5 accent-arx-primary" />
                      <span className="text-sm text-arx-slate font-semibold">{label}</span>
                    </label>
                  ))}
                </div>
              </DemoCard>

              <DemoCard label="Checkboxes">
                <div className="flex flex-col gap-3">
                  {[
                    { label: "Selection One", checked: false },
                    { label: "Selection Two", checked: true },
                    { label: "Selection Three", checked: false },
                    { label: "Selection Four", checked: true },
                  ].map(({ label, checked }) => (
                    <label key={label} className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" defaultChecked={checked} className="w-4 h-4 accent-arx-primary" />
                      <span className="text-sm text-arx-slate font-semibold">{label}</span>
                    </label>
                  ))}
                </div>
              </DemoCard>

              <DemoCard label="Error State — Radio">
                <div className="flex flex-col gap-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="radio" name="error-radio" className="w-5 h-5 accent-arx-errors" />
                    <span className="text-sm text-arx-errors font-semibold">Yes</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="radio" name="error-radio" className="w-5 h-5 accent-arx-errors" />
                    <span className="text-sm text-arx-errors font-semibold">No</span>
                  </label>
                  <p className="text-arx-errors text-xs">Please make a selection.</p>
                </div>
              </DemoCard>
            </div>
          </Section>

          {/* ══════════════════════════════════
              SECTION: DROPDOWNS
          ══════════════════════════════════ */}
          <Section
            id="dropdowns"
            title="Dropdowns"
            category="Components"
            description="Select menus in medium, small, and long variants. Error state adds a red border and label. Multi-select is supported via checkboxes inside the dropdown."
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-arx-slate">Input Title</label>
                <select className="h-10 px-3 text-sm border border-arx-borders rounded bg-white outline-none focus:ring-2 focus:ring-arx-primary">
                  <option value="">Select one</option>
                  <option>Selection One</option>
                  <option>Selection Two</option>
                  <option>Selection Three</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-arx-slate">Input Title</label>
                <select className="h-10 px-3 text-sm border border-arx-borders rounded bg-white outline-none focus:ring-2 focus:ring-arx-primary" defaultValue="Selection One">
                  <option>Selection One</option>
                  <option>Selection Two</option>
                  <option>Selection Three</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-arx-errors text-sm font-semibold">Input Title</label>
                <select className="h-10 px-3 text-sm border-2 border-arx-errors rounded bg-white outline-none focus:ring-2 focus:ring-arx-errors">
                  <option value="">Select one</option>
                </select>
                <p className="text-arx-errors text-xs">Error message</p>
              </div>
            </div>
          </Section>

          {/* ══════════════════════════════════
              SECTION: AGREEMENT BOXES
          ══════════════════════════════════ */}
          <Section
            id="agreement-boxes"
            title="Agreement Boxes"
            category="Components"
            description="Scrollable consent boxes. Required agreements disable the checkbox until the user scrolls to the bottom. Optional agreements show a purple 'Optional' label."
          >
            <div className="flex flex-wrap gap-6">
              <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-arx-body-copy">Required — Scroll to Agree</p>
                <AgreementBox requiresScroll />
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-arx-body-copy">Optional</p>
                <AgreementBox label="Patient Consent" optional />
              </div>
            </div>
          </Section>

          {/* ══════════════════════════════════
              SECTION: STEP INDICATORS
          ══════════════════════════════════ */}
          <Section
            id="step-indicators"
            title="Step Indicators"
            category="Components"
            description="Three progress indicator styles: Bar Progress (filled bar), Dot Progress (dot trail), and Pagination (numbered pages). Use Bar or Dot within a step flow; Pagination for tabular views."
          >
            <div className="flex flex-col gap-8">
              <DemoCard label="Bar Progress">
                <Stepper currentStep={1} totalSteps={7} />
              </DemoCard>
              <DemoCard label="Dot Progress">
                <DotStepper currentStep={3} totalSteps={7} />
              </DemoCard>
              <DemoCard label="Pagination">
                <Pagination />
              </DemoCard>
            </div>
          </Section>

          {/* ══════════════════════════════════
              SECTION: ISI BOX
          ══════════════════════════════════ */}
          <Section
            id="isi-box"
            title="ISI Box"
            category="Components"
            description="A scrollable inline ISI panel. Max height is 384px; content scrolls internally. Used within the right column of two-column step pages."
          >
            <ISIBox />
          </Section>

          {/* ══════════════════════════════════
              SECTION: MODALS
          ══════════════════════════════════ */}
          <Section
            id="modals"
            title="Modals"
            category="Components"
            description="Use modals to advise a user, ask permission, make a request, or confirm a selection. Always include a clear title, body description, and action buttons. Max width 448px."
          >
            <ModalPreview />
          </Section>

          {/* ══════════════════════════════════
              SECTION: SNACKBARS
          ══════════════════════════════════ */}
          <Section
            id="snackbars"
            title="Snackbars"
            category="Components"
            description="Toast-style notifications for Success (teal), Error (red), and Warning (orange) states. They appear temporarily at the top or bottom of the viewport."
          >
            <div className="flex flex-col gap-4 max-w-lg">
              <Snackbar type="success" message="Your changes have been saved successfully." />
              <Snackbar type="error" message="An error occurred. Please try again." />
              <Snackbar type="warning" message="Please review required fields before submitting." />
            </div>
          </Section>

          {/* ══════════════════════════════════
              SECTION: GREY BOX
          ══════════════════════════════════ */}
          <Section
            id="grey-box"
            title="Grey Box"
            category="Components"
            description="An informational card with a light grey background (#F8F8F8) and a border. Maximum 500 characters. Used for program notes, phone numbers, or secondary guidance."
          >
            <div className="max-w-lg">
              <GreyBox>
                <p className="font-semibold text-arx-slate mb-2">Program Assistance</p>
                <p>
                  If you need help with this program, please contact Customer Support at 877-450-4412. Representatives are available Monday through Friday, 8 AM – 8 PM EST.
                </p>
              </GreyBox>
            </div>
          </Section>

          {/* ══════════════════════════════════
              SECTION: UPLOAD CARDS
          ══════════════════════════════════ */}
          <Section
            id="upload-cards"
            title="Upload Cards"
            category="Patterns"
            description="Dashed-border drop zones for document upload. Accepts PDF, JPG, and PNG. The border transitions to teal on hover to signal interactivity."
          >
            <div className="flex flex-wrap gap-6">
              <UploadCard />
              <div className="border-2 border-dashed border-arx-primary rounded-lg p-8 flex flex-col items-center gap-3 w-56 text-center cursor-pointer">
                <div className="w-12 h-12 rounded-full bg-arx-sky flex items-center justify-center">
                  <Plus className="w-6 h-6 text-arx-primary" />
                </div>
                <p className="text-arx-primary font-semibold text-sm">Upload Document</p>
                <p className="text-arx-body-copy text-xs">Hover / Active State</p>
              </div>
            </div>
          </Section>

          {/* ══════════════════════════════════
              SECTION: SIGNATURE BOXES
          ══════════════════════════════════ */}
          <Section
            id="signature-boxes"
            title="Signature Boxes"
            category="Patterns"
            description="A three-part component: header label, drawing canvas, and action bar with Clear and Accept buttons. Width adapts to the container; canvas height is 96px."
          >
            <SigBox />
          </Section>

          {/* ══════════════════════════════════
              SECTION: PHOTO COLLAGES
          ══════════════════════════════════ */}
          <Section
            id="photo-collages"
            title="Photo Collages"
            category="Patterns"
            description="Image layout options for hero sections. Options A and B use multi-photo layered compositions with decorative teal and yellow circles. Option C is a single large image. Option D uses illustration-style graphics."
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
              <DemoCard label="Option A — Multi-photo with circles">
                <PhotoCollageA />
              </DemoCard>
              <DemoCard label="Option B — Two-photo overlap">
                <PhotoCollageB />
              </DemoCard>
              <DemoCard label="Option C — Single large image">
                <div className="w-64 h-44 rounded-lg bg-arx-sky/30 border border-arx-sky flex items-center justify-center text-arx-body-copy text-sm">
                  Single Photo
                </div>
              </DemoCard>
              <DemoCard label="Option D — Illustration">
                <div className="w-56 h-44 rounded-lg bg-arx-primary-30/30 border border-arx-primary-30 flex items-center justify-center text-arx-body-copy text-sm">
                  Illustration / Icon Art
                </div>
              </DemoCard>
            </div>
          </Section>

          {/* Bottom spacer */}
          <div className="h-24" />
        </div>
      </main>
    </div>
  );
}
