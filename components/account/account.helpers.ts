import type { ReactNode } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../lib/database.types.ts';
import type { WorkspaceRow, ConflictChoice } from '../../lib/types.ts';

export type SignInCredentials = { email: string; password: string };

export async function signInToWorkspace(
  client: SupabaseClient<Database>,
  credentials: SignInCredentials
): Promise<string> {
  try {
    const { error } = await client.auth.signInWithPassword({
      email: credentials.email.trim(),
      password: credentials.password
    });
    return error ? 'We couldn’t sign you in. Check your email and password, then try again.' : '';
  } catch {
    return 'We couldn’t reach your workspace. Check your connection and try again.';
  }
}

export async function resolveWorkspaceConflict(
  resolve: SyncNoticeProps['resolve'],
  choice: ConflictChoice
): Promise<string> {
  try {
    await resolve?.(choice);
    return '';
  } catch {
    return 'Could not preserve a recovery copy. Export your drafts, then try again.';
  }
}

export type AccountShellProps = { title: string; children?: ReactNode };

export type SignInProps = { client: SupabaseClient<Database>; sessionError?: string };

export type SignOutConfirmationProps = {
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  exportData: () => void;
  cacheError?: string;
};

export type SyncNoticeProps = {
  cloud?: boolean;
  error?: string;
  cacheError?: string;
  conflict?: WorkspaceRow | null;
  retry?: () => void | Promise<void>;
  resolve?: (choice: ConflictChoice) => Promise<void>;
  exportData: () => void;
};

export type WorkspaceProblemProps = {
  message: string;
  retry: () => void;
  signOut?: () => void | Promise<void>;
};
