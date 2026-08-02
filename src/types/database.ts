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
