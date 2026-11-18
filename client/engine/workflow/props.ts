/**
 * Prop matching for recipes and scopes. A prop value is a string, number, boolean, or a list of them (for example
 * `capture: ["signature", "upload_insurance"]`). Lists compare by content and order, not identity.
 */
export const propValueEquals = (a: unknown, b: unknown): boolean =>
  a === b || (typeof a === "object" && a !== null && typeof b === "object" && b !== null && JSON.stringify(a) === JSON.stringify(b));
