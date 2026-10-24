-- Files are separate from workspace JSON, so large PDFs never bloat chat sync or backups.
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
    'assistant-attachments',
    'assistant-attachments',
    false,
    50000000,
    array[
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp'
    ]
  )
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Workspace owner uploads planning files" on storage.objects for insert to authenticated
with
  check (
    bucket_id = 'assistant-attachments'
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

create policy "Workspace owner reads planning files" on storage.objects for
select
  to authenticated using (
    bucket_id = 'assistant-attachments'
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

create policy "Workspace owner removes planning files" on storage.objects for delete to authenticated using (
  bucket_id = 'assistant-attachments'
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

-- No UPDATE policy: attachment paths are immutable, including resumable uploads.
