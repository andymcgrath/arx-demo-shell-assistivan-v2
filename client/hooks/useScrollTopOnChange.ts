/**
 * Every screen change starts at the top. The phone frame clips its content, so the page, a wrapper or the window can
 * be the thing that scrolls, depending on the app. This resets all of them: the root, every ancestor, and any
 * descendant that has been scrolled down.
 */
import { useLayoutEffect, type RefObject } from "react";

export function resetScroll(root: HTMLElement | null) {
  if (!root) return;
  for (let el: HTMLElement | null = root; el; el = el.parentElement) {
    if (el.scrollTop) el.scrollTop = 0;
  }
  root.querySelectorAll<HTMLElement>("*").forEach((el) => {
    if (el.scrollTop) el.scrollTop = 0;
  });
  window.scrollTo(0, 0);
}

/** Pass the element that holds the screens and a key that changes with each screen. */
export function useScrollTopOnChange(ref: RefObject<HTMLElement>, key: string) {
  useLayoutEffect(() => {
    resetScroll(ref.current);
  }, [ref, key]);
}
