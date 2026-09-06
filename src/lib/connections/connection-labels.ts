import type {
  ConnectionInteractionType,
  ConnectionNudgeStatus,
  ConnectionPurpose,
  ConnectionType,
} from "@/src/types/database";

// Display copy for Diong Connections. Pure, deterministic, no data access.
// The nudge status itself is calculated in SQL by public.get_connection_nudges();
// this module only maps the returned values to human-readable text.

export const CONNECTION_TYPE_LABEL: Record<ConnectionType, string> = {
  friend: "Friend",
  family: "Family",
  mentor: "Mentor",
  accountability_partner: "Accountability partner",
  colleague: "Colleague",
  professional_contact: "Professional contact",
  collaborator: "Collaborator",
  study_partner: "Study partner",
  community: "Community member",
  coach_adviser: "Coach or adviser",
  other: "Other",
};

export const CONNECTION_PURPOSE_LABEL: Record<ConnectionPurpose, string> = {
  career_growth: "Career growth",
  accountability: "Accountability",
  learning: "Learning",
  friendship: "Friendship",
  family: "Family",
  collaboration: "Collaboration",
  networking: "Networking",
  support: "Support",
  shared_goal: "Shared goal",
  community: "Community",
  personal_growth: "Personal growth",
  other: "Other",
};

export const INTERACTION_TYPE_LABEL: Record<ConnectionInteractionType, string> = {
  message: "Message",
  call: "Call",
  video: "Video call",
  in_person: "In person",
  email: "Email",
  other: "Other",
};

export const NUDGE_STATUS_LABEL: Record<ConnectionNudgeStatus, string> = {
  due: "Needs attention",
  approaching: "Coming up",
  up_to_date: "Up to date",
  never_contacted: "Not yet connected",
};

const SUGGESTED_ACTION_BY_TYPE: Record<ConnectionType, string> = {
  friend: "Check in with someone you value but have not spoken to recently.",
  family: "Make intentional time to reconnect with a family member.",
  mentor: "Share a short update on your current work and ask one focused question.",
  accountability_partner:
    "Send a short progress update on the goal you agreed to work on.",
  colleague:
    "Share a brief note on what you are working on and where your work overlaps.",
  professional_contact:
    "Follow up with someone relevant to your current direction.",
  collaborator: "Confirm the next shared step and who is responsible for it.",
  study_partner:
    "Compare notes on what each of you is working through this week.",
  community: "Contribute one thoughtful message or question to the group.",
  coach_adviser:
    "Bring one specific question or decision you would value a perspective on.",
  other: "Reach out with a short, genuine check-in.",
};

/**
 * A calm, deterministic suggested action for a connection nudge. Returns an
 * empty string when no action is needed so callers can choose not to render one.
 */
export function suggestedConnectionAction(input: {
  connectionType: ConnectionType;
  status: ConnectionNudgeStatus;
}): string {
  if (input.status === "up_to_date") return "";
  return SUGGESTED_ACTION_BY_TYPE[input.connectionType];
}
