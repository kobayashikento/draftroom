-- The administrator provisions the owner's row. Browser users cannot create rows.
create table public.draftroom_workspaces (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb,
  revision bigint not null default 0 check (revision >= 0),
  updated_at timestamptz not null default now(),
  constraint workspace_shape check (
    data is null or (
      jsonb_typeof(data) = 'object'
      and data->>'version' = '1'
      and jsonb_typeof(data->'stages') = 'array'
      and jsonb_array_length(data->'stages') > 0
      and jsonb_typeof(data->'series') = 'array'
      and jsonb_typeof(data->'items') = 'array'
    ) is true
  )
);

alter table public.draftroom_workspaces enable row level security;

revoke all on public.draftroom_workspaces from anon, authenticated;
grant select on public.draftroom_workspaces to authenticated;
grant update (data) on public.draftroom_workspaces to authenticated;

create policy "Owner reads their workspace"
on public.draftroom_workspaces for select to authenticated
using ((select auth.uid()) = owner_id);

create policy "Owner updates their workspace"
on public.draftroom_workspaces for update to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

create function public.draftroom_bump_revision()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.revision := old.revision + 1;
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.draftroom_bump_revision() from public, anon, authenticated;

create trigger draftroom_revision_before_update
before update on public.draftroom_workspaces
for each row execute function public.draftroom_bump_revision();
