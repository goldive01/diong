// Pure validation and normalization for community creation. This is a
// usability / guard layer for the server action and client form — it does
// NOT replace the database (CHECK constraints, create_community()'s own
// re-validation), which stays authoritative.

export const RESERVED_COMMUNITY_SLUGS = new Set([
  // /communities/new is a static route; a community slugged "new" would be
  // unreachable at /communities/new (the route always wins).
  "new",
]);

export const COMMUNITY_NAME_MIN = 2;
export const COMMUNITY_NAME_MAX = 80;
export const COMMUNITY_SLUG_MIN = 3;
export const COMMUNITY_SLUG_MAX = 60;
export const COMMUNITY_DESCRIPTION_MAX = 2000;
export const COMMUNITY_RULES_MAX = 5000;

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Lowercase, trim, and collapse whitespace/underscores to hyphens. */
export function normalizeCommunitySlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export type CommunityField = "name" | "slug" | "description" | "rules";
export type CommunityErrors = Partial<Record<CommunityField, string>>;

export type CommunityInput = {
  name: string;
  slug: string;
  description: string;
  rules: string;
};

export function validateCommunityInput(input: CommunityInput): CommunityErrors {
  const errors: CommunityErrors = {};
  const name = input.name.trim();
  const slug = normalizeCommunitySlug(input.slug);
  const description = input.description.trim();
  const rules = input.rules.trim();

  if (name.length < COMMUNITY_NAME_MIN || name.length > COMMUNITY_NAME_MAX) {
    errors.name = `Name must be between ${COMMUNITY_NAME_MIN} and ${COMMUNITY_NAME_MAX} characters.`;
  }

  if (
    slug.length < COMMUNITY_SLUG_MIN ||
    slug.length > COMMUNITY_SLUG_MAX ||
    !SLUG_RE.test(slug)
  ) {
    errors.slug =
      "Slug must be 3–60 characters: lowercase letters, numbers and single hyphens only.";
  } else if (RESERVED_COMMUNITY_SLUGS.has(slug)) {
    errors.slug = "That slug is reserved. Choose another.";
  }

  if (description.length > COMMUNITY_DESCRIPTION_MAX) {
    errors.description = `Description must be ${COMMUNITY_DESCRIPTION_MAX} characters or fewer.`;
  }

  if (rules.length > COMMUNITY_RULES_MAX) {
    errors.rules = `Rules must be ${COMMUNITY_RULES_MAX} characters or fewer.`;
  }

  return errors;
}

export function hasCommunityErrors(errors: CommunityErrors): boolean {
  return Object.keys(errors).length > 0;
}
