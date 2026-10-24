import type { Workspace } from './types.ts';
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
