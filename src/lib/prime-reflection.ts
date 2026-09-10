// Pure reflection normalisation, validation and shared form plumbing for the
// Daily Prime completion reflection (Phase G). No data access, no React.
//
// The database CHECK constraint (prime_completions_reflection_length) and the
// public.save_prime_reflection() RPC remain authoritative. Everything here is a
// usability layer plus the types shared by the server action and the client
// form (runtime values cannot be exported from a "use server" module).

export const PRIME_REFLECTION_MAX_LENGTH = 2000;

// Shown as the reflection heading when a protocol has no reflection_prompt of
// its own. Deliberately calm and non-prescriptive.
export const DEFAULT_REFLECTION_PROMPT =
  "What did you notice about today's practice?";

export type PrimeReflectionFormValues = {
  reflection: string;
};

export const EMPTY_PRIME_REFLECTION_FORM: PrimeReflectionFormValues = {
  reflection: "",
};

export type SavePrimeReflectionState = {
  status: "idle" | "success" | "error";
  message: string;
  // Field-level error for the textarea (aria-describedby target).
  error?: string;
  // Echoed back so a validation failure never loses what the user typed.
  values: PrimeReflectionFormValues;
};

/**
 * Trim surrounding whitespace. Mirrors the RPC's `btrim` + `nullif(blank)`
 * behaviour: an all-whitespace reflection normalises to "" and is treated as
 * "no reflection".
 */
export function normalizePrimeReflection(raw: string): string {
  return raw.trim();
}

/**
 * Validate an already-normalised reflection. An empty reflection is valid — a
 * reflection is always optional. Returns an error message, or undefined when
 * the value is acceptable.
 */
export function validatePrimeReflection(value: string): string | undefined {
  if (value.length > PRIME_REFLECTION_MAX_LENGTH) {
    return `Please keep your reflection to ${PRIME_REFLECTION_MAX_LENGTH} characters or fewer.`;
  }
  return undefined;
}

function readText(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export function readPrimeReflectionFormValues(
  formData: FormData,
): PrimeReflectionFormValues {
  return { reflection: readText(formData, "reflection") };
}
