-- Imported media lives separately from the revisioned planning document.
-- No provider token or signed video URL is stored in a workspace export.
create table public.draftroom_social_accounts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.draftroom_workspaces (owner_id) on delete cascade,
  platform text not null check (platform in ('Instagram', 'TikTok')),
  external_id text not null,
  username text not null default '',
  display_name text not null default '',
  avatar_url text not null default '',
  status text not null default 'connected' check (
    status in ('connected', 'reconnect_required', 'disconnected')
  ),
  last_synced_at timestamptz,
  last_error text not null default '',
  metric_note text not null default '',
  cursor text,
  has_more boolean not null default false,
  sync_lock_until timestamptz,
  updated_at timestamptz not null default now(),
  unique (owner_id, platform)
);

create table public.draftroom_media (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.draftroom_workspaces (owner_id) on delete cascade,
  platform text check (platform in ('Instagram', 'TikTok')),
  external_id text,
  source text not null check (source in ('api', 'link', 'upload')),
  media_type text not null default 'video' check (media_type in ('video', 'image', 'carousel')),
  title text not null check (length(title) <= 240),
  caption text not null default '',
  permalink text not null default '',
  thumbnail_url text not null default '',
  media_url text not null default '',
  storage_path text not null default '',
  published_at timestamptz,
  duration double precision check (duration >= 0),
  metrics jsonb not null default '{"views":null,"likes":null,"comments":null,"shares":null,"saves":null,"reach":null}',
  metrics_updated_at timestamptz,
  linked_item_id text not null default '',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, platform, external_id),
  check (jsonb_typeof(metrics) = 'object'),
  check (
    (
      source = 'upload'
      and platform is null
      and storage_path <> ''
    )
    or (
      source <> 'upload'
      and platform is not null
      and permalink <> ''
    )
  )
);

create index draftroom_media_owner_date on public.draftroom_media (owner_id, published_at desc);

-- AES-GCM ciphertext only. No browser role can read these tables.
create table public.draftroom_social_tokens (
  owner_id uuid not null references public.draftroom_workspaces (owner_id) on delete cascade,
  platform text not null check (platform in ('Instagram', 'TikTok')),
  payload text not null,
  primary key (owner_id, platform)
);

create table public.draftroom_oauth_states (
  state_hash text primary key,
  owner_id uuid not null references public.draftroom_workspaces (owner_id) on delete cascade,
  platform text not null check (platform in ('Instagram', 'TikTok')),
  return_origin text not null,
  expires_at timestamptz not null
);

alter table public.draftroom_social_accounts enable row level security;

alter table public.draftroom_media enable row level security;

alter table public.draftroom_social_tokens enable row level security;

alter table public.draftroom_oauth_states enable row level security;

revoke all on public.draftroom_social_accounts,
public.draftroom_media,
public.draftroom_social_tokens,
public.draftroom_oauth_states
from
  public,
  anon,
  authenticated;

grant
select
  on public.draftroom_social_accounts,
  public.draftroom_media to authenticated;

grant all on public.draftroom_social_accounts,
public.draftroom_media,
public.draftroom_social_tokens,
public.draftroom_oauth_states to service_role;

create policy "Owner reads social accounts" on public.draftroom_social_accounts for
select
  to authenticated using (
    (
      select
        auth.uid ()
    ) = owner_id
  );

create policy "Owner reads imported media" on public.draftroom_media for
select
  to authenticated using (
    (
      select
        auth.uid ()
    ) = owner_id
  );

-- Consume state atomically so a callback cannot be replayed or exchanged twice.
create function public.draftroom_consume_oauth_state (state_digest text) returns setof public.draftroom_oauth_states language sql security definer
set
  search_path = '' as $$
  delete from public.draftroom_oauth_states
  where state_hash = state_digest and expires_at > now()
  returning *;
$$;

revoke all on function public.draftroom_consume_oauth_state (text)
from
  public,
  anon,
  authenticated;

grant
execute on function public.draftroom_consume_oauth_state (text) to service_role;

insert into
  storage.buckets (
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
  )
values
  (
    'draftroom-media',
    'draftroom-media',
    false,
    52428800,
    array['video/mp4', 'video/webm', 'video/quicktime']
  )
on conflict (id) do nothing;

create policy "Owner uploads private clips" on storage.objects for insert to authenticated
with
  check (
    bucket_id = 'draftroom-media'
    and (storage.foldername (name)) [1] = (
      select
        auth.uid ()
    )::text
    and exists (
      select
        1
      from
        public.draftroom_workspaces
      where
        owner_id = (
          select
            auth.uid ()
        )
    )
  );

create policy "Owner previews private clips" on storage.objects for
select
  to authenticated using (
    bucket_id = 'draftroom-media'
    and (storage.foldername (name)) [1] = (
      select
        auth.uid ()
    )::text
    and exists (
      select
        1
      from
        public.draftroom_workspaces
      where
        owner_id = (
          select
            auth.uid ()
        )
    )
  );

-- Cleanup is limited to the owner's uploads, including a cancelled/failed import.
create policy "Owner removes private clips" on storage.objects for delete to authenticated using (
  bucket_id = 'draftroom-media'
  and (storage.foldername (name)) [1] = (
    select
      auth.uid ()
  )::text
  and exists (
    select
      1
    from
      public.draftroom_workspaces
    where
      owner_id = (
        select
          auth.uid ()
      )
  )
);
