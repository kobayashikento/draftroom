import type {
  Workspace,
  WorkspaceRepository,
  WorkspaceRow,
  WorkspaceSnapshot,
  CacheStorage,
  ConflictChoice,
  StorageStatus
} from './types.ts';
import { readCache, validateWorkspace } from './workspace-data.ts';
import { WorkspaceConflictError } from './workspace-repository.ts';

const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

// One serial writer per signed-in workspace. Revisions are enforced by Postgres.
export class WorkspaceSync {
  repository: WorkspaceRepository;
  storage: CacheStorage;
  cacheKey: string;
  onChange: (snapshot: WorkspaceSnapshot) => void;
  delay: number;
  data: Workspace | null;
  revision: number;
  dirty: boolean;
  status: StorageStatus;
  error: string;
  cacheError: string;
  conflict: WorkspaceRow | null;
  disposed: boolean;
  timer: ReturnType<typeof setTimeout> | undefined;
  saving: Promise<void> | null = null;
  constructor({
    repository,
    storage,
    cacheKey,
    onChange,
    delay = 600
  }: {
    repository: WorkspaceRepository;
    storage: CacheStorage;
    cacheKey: string;
    onChange: (snapshot: WorkspaceSnapshot) => void;
    delay?: number;
  }) {
    this.repository = repository;
    this.storage = storage;
    this.cacheKey = cacheKey;
    this.onChange = onChange;
    this.delay = delay;
    this.data = null;
    this.revision = 0;
    this.dirty = false;
    this.status = 'loading';
    this.error = '';
    this.cacheError = '';
    this.conflict = null;
    this.disposed = false;
  }

  emit() {
    if (!this.disposed)
      this.onChange({
        data: this.data,
        revision: this.revision,
        dirty: this.dirty,
        status: this.status,
        error: this.error,
        cacheError: this.cacheError,
        conflict: this.conflict
      });
  }

  cache() {
    try {
      this.storage.setItem(
        this.cacheKey,
        JSON.stringify({ data: this.data, revision: this.revision, dirty: this.dirty })
      );
      this.cacheError = '';
    } catch {
      this.cacheError =
        'This browser could not save a recovery copy. Export a backup if the cloud is unavailable.';
    }
  }

  async start(initialWorkspace: () => Workspace) {
    // Never replace an unreadable cache with fresh demo data.
    const cache = readCache(this.storage, this.cacheKey);
    const remote = await this.repository.load();
    if (this.disposed) return;
    this.revision = remote.revision;
    if (cache?.dirty && !equal(cache.data, remote.data)) {
      this.data = cache.data;
      this.dirty = true;
      this.revision = cache.revision;
      if (cache.revision !== remote.revision) this.conflict = remote;
    } else if (remote.data !== null) {
      this.data = remote.data;
    } else {
      // Called only for a provisioned, empty workspace; existing cloud data wins.
      this.data = validateWorkspace(initialWorkspace());
      this.dirty = true;
    }
    this.status = this.conflict ? 'conflict' : this.dirty ? 'pending' : 'saved';
    this.cache();
    this.emit();
    if (this.dirty && !this.conflict) this.schedule();
  }

  change(data: Workspace) {
    if (this.disposed || !this.data) return;
    this.data = validateWorkspace(data);
    this.dirty = true;
    this.error = '';
    this.status = this.conflict ? 'conflict' : 'pending';
    this.cache();
    this.emit();
    this.schedule();
  }

  schedule() {
    clearTimeout(this.timer);
    if (!this.conflict && !this.disposed)
      this.timer = setTimeout(() => void this.flush(), this.delay);
  }

  async flush(): Promise<boolean> {
    clearTimeout(this.timer);
    if (this.disposed || this.conflict) return false;
    if (this.saving) {
      await this.saving;
      return !this.dirty;
    }
    if (!this.dirty) return true;
    const snapshot = this.data;
    if (!snapshot) return false;
    this.status = 'saving';
    this.emit();
    this.saving = (async () => {
      try {
        const saved = await this.repository.save(snapshot, this.revision);
        if (this.disposed) return;
        this.revision = saved.revision;
        this.dirty = this.data !== snapshot;
        this.status = this.dirty ? 'pending' : 'saved';
        this.error = '';
        this.cache();
      } catch (error) {
        if (this.disposed) return;
        this.error = error instanceof Error ? error.message : 'Could not sync your workspace.';
        this.status = 'error';
        if (error instanceof WorkspaceConflictError) {
          try {
            const remote = await this.repository.load();
            if (this.disposed) return;
            if (equal(remote.data, this.data)) {
              // Also recovers when a successful write lost its network response.
              this.revision = remote.revision;
              this.dirty = false;
              this.error = '';
              this.status = 'saved';
              this.cache();
            } else {
              this.conflict = remote;
              this.status = 'conflict';
            }
          } catch {
            this.error =
              'A newer cloud version exists. Reconnect and retry before saving more changes.';
          }
        }
      }
    })();
    await this.saving;
    this.saving = null;
    this.emit();
    if (this.dirty && this.isPending()) return this.flush();
    return !this.dirty;
  }

  isPending() {
    return this.status === 'pending';
  }

  async refresh() {
    if (this.disposed || this.conflict) return;
    if (this.saving) await this.saving;
    const readRevision = this.revision;
    try {
      const remote = await this.repository.load();
      if (this.disposed) return;
      // A save may have started or finished while this read was in flight.
      // Its older response must not roll the UI/cache back after that save.
      if (this.saving || this.revision !== readRevision) return;
      if (this.dirty && remote.revision !== this.revision && !equal(remote.data, this.data)) {
        this.conflict = remote;
        this.status = 'conflict';
      } else if (!this.dirty || equal(remote.data, this.data)) {
        if (remote.data === null) return;
        this.data = remote.data;
        this.revision = remote.revision;
        this.dirty = false;
        this.error = '';
        this.status = 'saved';
        this.cache();
      } else {
        this.error = '';
        this.status = 'pending';
      }
      this.emit();
      if (this.dirty && !this.conflict) await this.flush();
    } catch (error) {
      if (this.disposed) return;
      this.error = error instanceof Error ? error.message : 'Could not sync your workspace.';
      this.status = 'error';
      this.emit();
    }
  }

  async resolve(choice: ConflictChoice) {
    if (!this.conflict || this.disposed) return;
    // Keep the version being replaced as a local recovery copy.
    const recovery = choice === 'cloud' ? this.data : this.conflict.data;
    this.storage.setItem(`${this.cacheKey}:recovery:${Date.now()}`, JSON.stringify(recovery));
    this.revision = this.conflict.revision;
    if (choice === 'cloud') {
      if (this.conflict.data === null)
        throw new Error('The cloud workspace is empty. Keep this device’s version to restore it.');
      this.data = this.conflict.data;
      this.dirty = false;
    } else {
      this.dirty = true;
    }
    this.conflict = null;
    this.error = '';
    this.status = this.dirty ? 'pending' : 'saved';
    this.cache();
    this.emit();
    if (this.dirty) await this.flush();
  }

  dispose() {
    this.disposed = true;
    clearTimeout(this.timer);
  }
}
