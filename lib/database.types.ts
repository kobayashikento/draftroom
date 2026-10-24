import type { Workspace } from './types.ts';
import type {
  MediaRecord,
  SocialAccount,
  StoredSocialToken,
  OAuthState
} from '../supabase/functions/_shared/social-types.ts';
export type Database = {
  public: {
    Tables: {
      draftroom_workspaces: {
        Row: { owner_id: string; data: Workspace | null; revision: number; updated_at: string };
        Insert: {
          owner_id: string;
          data?: Workspace | null;
          revision?: number;
          updated_at?: string;
        };
        Update: { data?: Workspace };
        Relationships: [];
      };
      draftroom_media: {
        Row: MediaRecord;
        Insert: MediaRecord;
        Update: Partial<MediaRecord>;
        Relationships: [];
      };
      draftroom_social_accounts: {
        Row: SocialAccount;
        Insert: SocialAccount;
        Update: Partial<SocialAccount>;
        Relationships: [];
      };
      draftroom_social_tokens: {
        Row: StoredSocialToken;
        Insert: StoredSocialToken;
        Update: Partial<StoredSocialToken>;
        Relationships: [];
      };
      draftroom_oauth_states: {
        Row: OAuthState;
        Insert: OAuthState;
        Update: Partial<OAuthState>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      draftroom_consume_oauth_state: { Args: { state_digest: string }; Returns: OAuthState[] };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
