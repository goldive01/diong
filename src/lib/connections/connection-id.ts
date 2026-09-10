// Shared route-param parsing for the connection detail and edit routes, so the
// two pages can never diverge in how they turn `params.id` into a lookup key.

/**
 * Parse a dynamic-route `id` segment into a positive connection id.
 *
 * Returns `null` for anything that is not a base-10 positive integer — `""`,
 * `"0"`, `"1.5"`, `"1e3"`, `"0x1"`, `" 1 "`, `"1abc"`, `undefined` — and for
 * integers outside the safe range. Callers `notFound()` on `null`.
 *
 * Stricter than `Number(...)`, which coerces `""` to `0` and `"1abc"` to `NaN`.
 */
export function parseConnectionId(raw: string | undefined): number | null {
  if (typeof raw !== "string" || !/^\d+$/.test(raw)) return null;
  const id = Number(raw);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}
