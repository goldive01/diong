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
