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

interface PortalNavCtx {
  path: string;
  navigate: (to: string, opts?: { replace?: boolean }) => void;
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
  const [path, setPath] = useState(initialPath);
  const navigate = useCallback((to: string) => {
    setPath(to);
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
