export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
};

export type Interest = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
};

export type UserInterest = {
  user_id: string;
  interest_id: number;
  created_at: string;
};

export type PrimeCategory = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  interest_id: number | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
};

export type PrimeProtocol = {
  id: number;
  category_id: number;
  slug: string;
  title: string;
  purpose: string | null;
  best_time: string | null;
  prime_text: string;
  action_trigger: string;
  tomorrows_expectation: string | null;
  reflection_prompt: string | null;
  status: "draft" | "published" | "archived";
  created_at: string;
  updated_at: string;
};

export type PrimeAssignment = {
  id: number;
  user_id: string;
  prime_protocol_id: number;
  assigned_date: string;
  created_at: string;
};

export type PrimeCompletion = {
  id: number;
  user_id: string;
  prime_assignment_id: number;
  completion_date: string;
  completed_at: string;
  note: string | null;
  reflection: string | null;
};

export type DailyPrime = {
  assignment_id: number;
  assigned_date: string;
  protocol_id: number;
  category_name: string;
  title: string;
  purpose: string | null;
  best_time: string | null;
  prime_text: string;
  action_trigger: string;
  tomorrows_expectation: string | null;
  reflection_prompt: string | null;
  completed_at: string | null;
};

export type ConnectionType =
  | "friend"
  | "family"
  | "mentor"
  | "accountability_partner"
  | "colleague"
  | "professional_contact"
  | "collaborator"
  | "study_partner"
  | "community"
  | "coach_adviser"
  | "other";

export type ConnectionPurpose =
  | "career_growth"
  | "accountability"
  | "learning"
  | "friendship"
  | "family"
  | "collaboration"
  | "networking"
  | "support"
  | "shared_goal"
  | "community"
  | "personal_growth"
  | "other";

export type ConnectionInteractionType =
  | "message"
  | "call"
  | "video"
  | "in_person"
  | "email"
  | "other";

export type Connection = {
  id: number;
  user_id: string;
  name: string;
  connection_type: ConnectionType;
  connection_purpose: ConnectionPurpose;
  why_it_matters: string | null;
  preferred_contact_days: number | null;
  last_meaningful_contact_at: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ConnectionInteraction = {
  id: number;
  user_id: string;
  connection_id: number;
  interaction_type: ConnectionInteractionType;
  occurred_at: string;
  notes: string | null;
  created_at: string;
};

export type ConnectionNudgeStatus =
  | "due"
  | "approaching"
  | "up_to_date"
  | "never_contacted";

// Row shape returned by public.get_connection_nudges().
export type ConnectionNudge = {
  connection_id: number;
  name: string;
  connection_type: ConnectionType;
  connection_purpose: ConnectionPurpose;
  last_meaningful_contact_at: string | null;
  preferred_contact_days: number | null;
  days_since: number | null;
  status: ConnectionNudgeStatus;
};

// Row shape returned by public.record_connection_interaction().
export type RecordedConnectionInteraction = {
  interaction_id: number;
  connection_id: number;
  occurred_at: string;
  last_meaningful_contact_at: string;
};

type TableDefinition<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: TableDefinition<
        Profile,
        {
          id: string;
          username?: string | null;
          display_name?: string | null;
          bio?: string | null;
          avatar_url?: string | null;
          onboarding_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        },
        Partial<Omit<Profile, "id" | "created_at">> & { id?: string }
      >;
      interests: TableDefinition<
        Interest,
        {
          id?: number;
          slug: string;
          name: string;
          description?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
        },
        Partial<Omit<Interest, "id" | "created_at">>
      >;
      user_interests: TableDefinition<
        UserInterest,
        { user_id: string; interest_id: number; created_at?: string },
        { user_id?: never; interest_id?: never; created_at?: never }
      >;
      prime_categories: TableDefinition<
        PrimeCategory,
        Omit<PrimeCategory, "id" | "created_at"> & { id?: number; created_at?: string },
        Partial<Omit<PrimeCategory, "id" | "created_at">>
      >;
      prime_protocols: TableDefinition<
        PrimeProtocol,
        Omit<PrimeProtocol, "id" | "created_at" | "updated_at"> & {
          id?: number;
          created_at?: string;
          updated_at?: string;
        },
        Partial<Omit<PrimeProtocol, "id" | "created_at">>
      >;
      prime_assignments: TableDefinition<
        PrimeAssignment,
        Omit<PrimeAssignment, "id" | "created_at"> & { id?: number; created_at?: string },
        Partial<Omit<PrimeAssignment, "id" | "created_at">>
      >;
      prime_completions: TableDefinition<
        PrimeCompletion,
        Omit<PrimeCompletion, "id" | "completed_at"> & { id?: number; completed_at?: string },
        Partial<Omit<PrimeCompletion, "id" | "completed_at">>
      >;
      connections: TableDefinition<
        Connection,
        // Mirrors the column-scoped INSERT grant in the migration. id,
        // created_at and updated_at are owned by defaults/trigger;
        // last_meaningful_contact_at is system-managed via the Phase B RPC.
        {
          user_id: string;
          name: string;
          connection_type: ConnectionType;
          connection_purpose: ConnectionPurpose;
          why_it_matters?: string | null;
          preferred_contact_days?: number | null;
          notes?: string | null;
          is_active?: boolean;
        },
        // Mirrors the column-scoped UPDATE grant in the migration. user_id, id,
        // the timestamps and last_meaningful_contact_at are not client-writable.
        Partial<
          Pick<
            Connection,
            | "name"
            | "connection_type"
            | "connection_purpose"
            | "why_it_matters"
            | "preferred_contact_days"
            | "notes"
            | "is_active"
          >
        >
      >;
      connection_interactions: TableDefinition<
        ConnectionInteraction,
        // No direct INSERT grant or policy in V1. Rows are created only by the
        // Phase B record_connection_interaction() SECURITY DEFINER RPC.
        Record<string, never>,
        // Append-only: no UPDATE or DELETE grant or policy exists.
        Record<string, never>
      >;
    };
    Views: Record<string, never>;
    Functions: {
      complete_onboarding: {
        Args: {
          p_username: string;
          p_display_name: string;
          p_bio: string | null;
          p_interest_ids: number[];
        };
        Returns: undefined;
      };
      get_or_assign_daily_prime: {
        Args: Record<never, never>;
        Returns: DailyPrime[];
      };
      complete_daily_prime: {
        Args: { p_assignment_id: number };
        Returns: string;
      };
      save_prime_reflection: {
        Args: { p_assignment_id: number; p_reflection: string | null };
        Returns: string;
      };
      record_connection_interaction: {
        Args: {
          p_connection_id: number;
          p_interaction_type: ConnectionInteractionType;
          p_occurred_at?: string;
          p_notes?: string | null;
        };
        Returns: RecordedConnectionInteraction[];
      };
      get_connection_nudges: {
        Args: Record<never, never>;
        Returns: ConnectionNudge[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export interface OnboardingFormData {
  username: string;
  displayName: string;
  bio: string;
  interestIds: number[];
}

export interface ProfileUpdateData {
  username: string;
  displayName: string;
  bio: string;
}
