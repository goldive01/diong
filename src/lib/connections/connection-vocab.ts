import type {
  ConnectionInteractionType,
  ConnectionPurpose,
  ConnectionType,
} from "@/src/types/database";

// Runtime mirrors of the string-literal unions in src/types/database.ts.
// The `Record<Union, true>` annotation makes the compiler reject this file if a
// union member is missing here or an unknown value is added, so the unions in
// database.ts stay the single source of truth for the vocabulary.

const connectionTypeRecord: Record<ConnectionType, true> = {
  friend: true,
  family: true,
  mentor: true,
  accountability_partner: true,
  colleague: true,
  professional_contact: true,
  collaborator: true,
  study_partner: true,
  community: true,
  coach_adviser: true,
  other: true,
};

const connectionPurposeRecord: Record<ConnectionPurpose, true> = {
  career_growth: true,
  accountability: true,
  learning: true,
  friendship: true,
  family: true,
  collaboration: true,
  networking: true,
  support: true,
  shared_goal: true,
  community: true,
  personal_growth: true,
  other: true,
};

const interactionTypeRecord: Record<ConnectionInteractionType, true> = {
  message: true,
  call: true,
  video: true,
  in_person: true,
  email: true,
  other: true,
};

export const CONNECTION_TYPES = Object.keys(
  connectionTypeRecord,
) as ConnectionType[];

export const CONNECTION_PURPOSES = Object.keys(
  connectionPurposeRecord,
) as ConnectionPurpose[];

export const INTERACTION_TYPES = Object.keys(
  interactionTypeRecord,
) as ConnectionInteractionType[];

const connectionTypeSet: ReadonlySet<string> = new Set(CONNECTION_TYPES);
const connectionPurposeSet: ReadonlySet<string> = new Set(CONNECTION_PURPOSES);
const interactionTypeSet: ReadonlySet<string> = new Set(INTERACTION_TYPES);

export function isConnectionType(value: unknown): value is ConnectionType {
  return typeof value === "string" && connectionTypeSet.has(value);
}

export function isConnectionPurpose(value: unknown): value is ConnectionPurpose {
  return typeof value === "string" && connectionPurposeSet.has(value);
}

export function isInteractionType(
  value: unknown,
): value is ConnectionInteractionType {
  return typeof value === "string" && interactionTypeSet.has(value);
}
