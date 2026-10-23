-- Run after creating this email/password user in Supabase Authentication.
-- This grants access only to the explicitly provisioned owner.
do $$
declare owner uuid;
begin
  select id into owner from auth.users where lower(email) = 'morningswithemi@gmail.com';
  if owner is null then
    raise exception 'Create morningswithemi@gmail.com in Authentication > Users first.';
  end if;
  if exists (select 1 from public.draftroom_workspaces where owner_id <> owner) then
    raise exception 'A different owner is already provisioned. No access was changed.';
  end if;
  insert into public.draftroom_workspaces (owner_id) values (owner) on conflict (owner_id) do nothing;
end;
$$;
