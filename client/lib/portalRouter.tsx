/**
 * portalRouter — lightweight state-based navigation for portal sub-apps.
 *
 * Replaces MemoryRouter for portals embedded in the shell's BrowserRouter.
 * React Router v6 throws if you nest any Router (including MemoryRouter)
 * inside another Router — this provides the same API without a real Router.
 *
 * Usage in a portal index.tsx:
 *   <PortalRouter>
 *     <YourPortalContent />
 *   </PortalRouter>
 *
 * In portal pages, replace:
 *   import { useNavigate, Link, useLocation } from "react-router-dom";
 * with:
 *   import { useNavigate, Link, useLocation } from "@/lib/portalRouter";
 */
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  Children,
  isValidElement,
  type ReactNode,
  type MouseEvent,
  type AnchorHTMLAttributes,
} from "react";

// ── Context ───────────────────────────────────────────────────────────────────

export interface NavOptions {
  /** Swap the current entry instead of adding one. */
  replace?: boolean;
  /** Forget the history and start again at `to`. A Reset or an Undo uses it. */
  reset?: boolean;
}

interface PortalNavCtx {
  path: string;
  /** A path goes there. A negative number goes back that many entries, like react-router's `navigate(-1)`. */
  navigate: (to: string | number, opts?: NavOptions) => void;
}

const MAX_HISTORY = 50;

/** The history after one navigation. Going back never leaves the first entry. Pure, so a test can read it. */
export function nextHistory(stack: string[], to: string | number, opts: NavOptions = {}): string[] {
  if (typeof to === "number") return to < 0 ? stack.slice(0, Math.max(1, stack.length + to)) : stack;
  if (opts.reset) return [to];
  if (opts.replace) return [...stack.slice(0, -1), to];
  if (stack[stack.length - 1] === to) return stack;
  return [...stack, to].slice(-MAX_HISTORY);
}

const Ctx = createContext<PortalNavCtx | null>(null);

function useCtx(): PortalNavCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("portalRouter hooks must be used inside <PortalRouter>");
  return ctx;
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function PortalRouter({
  children,
  initialPath = "/",
}: {
  children: ReactNode;
  initialPath?: string;
}) {
  const [history, setHistory] = useState<string[]>([initialPath]);
  const path = history[history.length - 1];
  const navigate = useCallback((to: string | number, opts?: NavOptions) => {
    setHistory((h) => nextHistory(h, to, opts));
    // Scroll to top on navigation within the portal
    requestAnimationFrame(() => {
      // Try scrolling the main element (patient portal pages)
      const main = document.querySelector("main.flex-grow");
      if (main) {
        main.parentElement?.scrollTo({ top: 0, behavior: "auto" });
        // Also try scrolling the main itself
        if ((main as any).scrollHeight > 0) {
          (main as HTMLElement).scrollTop = 0;
        }
      }

      // Also scroll the outer overflow-y-auto container
      const iPhoneScroll = document.querySelector(".i17pro__content")?.parentElement?.parentElement;
      if (iPhoneScroll?.classList.contains("overflow-y-auto")) {
        (iPhoneScroll as HTMLElement).scrollTop = 0;
      }
    });
  }, []);
  return <Ctx.Provider value={{ path, navigate }}>{children}</Ctx.Provider>;
}

// ── Routing ───────────────────────────────────────────────────────────────────

/** Drop-in for react-router-dom's Route (config only; Routes handles rendering) */
export function Route(_: { path: string; element: ReactNode }) {
  return null;
}

/** Drop-in for react-router-dom's Routes — renders the first matching Route child */
export function Routes({ children }: { children: ReactNode }) {
  const { path } = useCtx();
  let match: ReactNode = null;
  Children.forEach(children, (child) => {
    if (!isValidElement(child) || match !== null) return;
    const routePath = (child.props as { path: string }).path;
    if (routePath === path) {
      match = (child.props as { element: ReactNode }).element;
    }
  });
  return <>{match ?? null}</>;
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

/** Drop-in for react-router-dom's useNavigate */
export function useNavigate() {
  const { navigate } = useCtx();
  return navigate;
}

/** Drop-in for react-router-dom's useLocation */
export function useLocation() {
  const { path } = useCtx();
  return { pathname: path, search: "", hash: "", state: null, key: "portal" };
}

/** Expose current path for page-switcher components */
export function usePortalPath() {
  return useCtx().path;
}

// ── Components ────────────────────────────────────────────────────────────────

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  to: string;
};

/** Drop-in for react-router-dom's Link */
export function Link({ to, children, onClick, ...rest }: LinkProps) {
  const { navigate } = useCtx();
  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    onClick?.(e);
    navigate(to);
  };
  return (
    <a href="#" onClick={handleClick} {...rest}>
      {children}
    </a>
  );
}
