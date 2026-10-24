'use client';

import type { WorkspaceProviderProps } from './workspace/workspace.helpers.ts';
import { getSupabaseClient } from '../lib/supabase.ts';
import WorkspaceProblem from './account/workspace-problem';
import LocalWorkspace from './workspace/local-workspace';
import AuthenticatedWorkspace from './workspace/authenticated-workspace';

export function WorkspaceProvider({ children }: WorkspaceProviderProps) {
  let client;
  try {
    client = getSupabaseClient();
  } catch (error) {
    return (
      <WorkspaceProblem
        message={error instanceof Error ? error.message : 'Could not open your workspace.'}
        retry={() => window.location.reload()}
      />
    );
  }
  return client ? (
    <AuthenticatedWorkspace client={client}>{children}</AuthenticatedWorkspace>
  ) : (
    <LocalWorkspace>{children}</LocalWorkspace>
  );
}
