import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types.ts';
import type { WorkspaceRepository, Workspace } from './types.ts';
import { validateWorkspace } from './workspace-data.ts';

export class WorkspaceConflictError extends Error {
  constructor() {
    super('A newer version was saved on another device. Choose which version to keep.');
    this.name = 'WorkspaceConflictError';
  }
}

export function createWorkspaceRepository(
  client: SupabaseClient<Database>,
  ownerId: string,
): WorkspaceRepository {
  return {
    async load() {
      const { data, error } = await client
        .from('draftroom_workspaces')
        .select('data, revision')
        .eq('owner_id', ownerId)
        .maybeSingle();
      if (error)
        throw new Error(
          'Could not load your cloud workspace. Check your connection and try again.',
          { cause: error },
        );
      if (!data)
        throw new Error(
          'This account does not have access to draftroom yet. Ask the project owner to finish your workspace setup.',
        );
      if (data.data !== null) validateWorkspace(data.data);
      return { data: data.data, revision: Number(data.revision) };
    },
    async save(workspace: Workspace, revision: number) {
      validateWorkspace(workspace);
      const { data, error } = await client
        .from('draftroom_workspaces')
        .update({ data: workspace })
        .eq('owner_id', ownerId)
        .eq('revision', revision)
        .select('data, revision')
        .maybeSingle();
      if (error)
        throw new Error(
          'Your latest changes have not reached the cloud. Check your connection and retry.',
          { cause: error },
        );
      if (!data) throw new WorkspaceConflictError();
      return { data: data.data, revision: Number(data.revision) };
    },
  };
}
