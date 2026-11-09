/**
 * Standard logo boxes. Every logo gets a fixed width and height, and `object-contain` scales the
 * file to fit inside that box with its aspect ratio locked. A wide wordmark and a square mark
 * take the same space, so a rebrand never pushes other controls off the screen.
 *
 * Tune the numbers here. Callers pick a size by name and do not set width or height.
 */
export const MANUFACTURER_LOGO_SIZES = {
  /** Top bar. Leaves room for the menu button and the help link on a phone. */
  header: "w-[140px] h-10 object-contain object-left",
  /**
   * 70% of the header box (98 x 28 against 140 x 40), the same 3.5:1 shape, so one wide lockup fits both. It sits beside
   * 11px tagline text, and a typical logo renders a little taller than that text.
   */
  footer: "w-[98px] h-7 object-contain object-left",
} as const;

export const PROGRAM_LOGO_SIZES = {
  card: "w-[120px] h-10 object-contain object-left",
  small: "w-[100px] h-6 object-contain object-left",
  row: "w-[160px] h-8 object-contain object-left",
} as const;

/**
 * Text stand-in for a drug with no logo file. It sizes by font, not by box, so a long name
 * is never cut off.
 */
export const PROGRAM_LOGO_TEXT_SIZES = {
  card: "text-lg",
  small: "text-sm",
  row: "text-base",
} as const;

export type ManufacturerLogoSize = keyof typeof MANUFACTURER_LOGO_SIZES;
export type ProgramLogoSize = keyof typeof PROGRAM_LOGO_SIZES;
