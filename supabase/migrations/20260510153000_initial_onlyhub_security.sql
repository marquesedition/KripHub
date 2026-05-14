create extension if not exists pgcrypto;

create schema if not exists app_private;

create type public.media_type as enum ('image', 'video');
create type public.access_type as enum ('temporary', 'permanent');
create type public.access_code_status as enum ('active', 'used', 'expired', 'revoked');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null unique check (length(nickname) between 3 and 40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.collections (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (length(title) between 1 and 120),
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.media (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.collections(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  type public.media_type not null,
  title text not null check (length(title) between 1 and 160),
  encrypted_storage_path text not null unique check (right(encrypted_storage_path, 4) = '.enc'),
  thumbnail_encrypted_storage_path text unique check (
    thumbnail_encrypted_storage_path is null
    or right(thumbnail_encrypted_storage_path, 4) = '.enc'
  ),
  encryption_version integer not null default 1 check (encryption_version > 0),
  nonce text not null,
  auth_tag text not null,
  size_bytes bigint not null check (size_bytes > 0),
  created_at timestamptz not null default now()
);

create table public.access_codes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  collection_id uuid not null references public.collections(id) on delete cascade,
  code_hash text not null unique,
  access_type public.access_type not null,
  duration_minutes integer check (duration_minutes is null or duration_minutes between 1 and 43200),
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  max_uses integer check (max_uses is null or max_uses > 0),
  used_count integer not null default 0 check (used_count >= 0),
  status public.access_code_status not null default 'active',
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  check (
    (access_type = 'temporary' and duration_minutes is not null and expires_at is not null)
    or
    (access_type = 'permanent' and duration_minutes is null and expires_at is null)
  )
);

create table public.access_sessions (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  access_code_id uuid not null references public.access_codes(id) on delete cascade,
  collection_id uuid not null references public.collections(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  access_type public.access_type not null,
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  unique (recipient_id, access_code_id)
);

create table public.media_keys (
  id uuid primary key default gen_random_uuid(),
  media_id uuid not null references public.media(id) on delete cascade,
  access_code_id uuid not null references public.access_codes(id) on delete cascade,
  encrypted_media_key text not null,
  key_encryption_version integer not null default 1 check (key_encryption_version > 0),
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  unique (media_id, access_code_id)
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  target_type text,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.code_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  code_hash text,
  success boolean not null default false,
  created_at timestamptz not null default now()
);

create index collections_owner_id_idx on public.collections(owner_id);
create index media_collection_id_idx on public.media(collection_id);
create index media_owner_id_idx on public.media(owner_id);
create index media_created_at_idx on public.media(created_at desc);
create index access_codes_owner_status_idx on public.access_codes(owner_id, status, created_at desc);
create index access_codes_collection_idx on public.access_codes(collection_id);
create index access_sessions_recipient_active_idx
  on public.access_sessions(recipient_id, expires_at)
  where revoked_at is null;
create index access_sessions_owner_idx on public.access_sessions(owner_id, created_at desc);
create index access_sessions_code_idx on public.access_sessions(access_code_id);
create index media_keys_access_code_id_idx on public.media_keys(access_code_id);
create index media_keys_media_id_idx on public.media_keys(media_id);
create index code_attempts_user_created_idx on public.code_attempts(user_id, created_at desc);
create index audit_events_created_at_idx on public.audit_events(created_at desc);

create or replace function app_private.touch_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function app_private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  nickname_from_email text;
begin
  nickname_from_email := split_part(coalesce(new.email, new.id::text), '@', 1);

  insert into public.profiles (id, nickname)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'nickname', ''), nickname_from_email)
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create or replace function app_private.owns_collection(collection_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.collections c
    where c.id = collection_uuid
      and c.owner_id = auth.uid()
  );
$$;

create or replace function app_private.has_active_collection_access(collection_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.access_sessions s
    where s.collection_id = collection_uuid
      and s.recipient_id = auth.uid()
      and s.revoked_at is null
      and (s.expires_at is null or s.expires_at > now())
  );
$$;

create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function app_private.touch_updated_at();

create trigger collections_touch_updated_at
before update on public.collections
for each row execute function app_private.touch_updated_at();

create trigger auth_users_create_profile
after insert on auth.users
for each row execute function app_private.handle_new_user();

alter table public.profiles enable row level security;
alter table public.collections enable row level security;
alter table public.media enable row level security;
alter table public.access_codes enable row level security;
alter table public.access_sessions enable row level security;
alter table public.media_keys enable row level security;
alter table public.audit_events enable row level security;
alter table public.code_attempts enable row level security;

create policy "profiles_select_own"
on public.profiles for select
to authenticated
using (id = auth.uid());

create policy "profiles_update_own"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "collections_owner_insert"
on public.collections for insert
to authenticated
with check (owner_id = auth.uid());

create policy "collections_owner_manage"
on public.collections for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "collections_owner_delete"
on public.collections for delete
to authenticated
using (owner_id = auth.uid());

create policy "collections_read_owned_or_authorized"
on public.collections for select
to authenticated
using (
  owner_id = auth.uid()
  or app_private.has_active_collection_access(id)
);

create policy "media_owner_insert"
on public.media for insert
to authenticated
with check (
  owner_id = auth.uid()
  and app_private.owns_collection(collection_id)
);

create policy "media_owner_update"
on public.media for update
to authenticated
using (owner_id = auth.uid())
with check (
  owner_id = auth.uid()
  and app_private.owns_collection(collection_id)
);

create policy "media_owner_delete"
on public.media for delete
to authenticated
using (owner_id = auth.uid());

create policy "media_read_owned_or_authorized"
on public.media for select
to authenticated
using (
  owner_id = auth.uid()
  or app_private.has_active_collection_access(collection_id)
);

create policy "access_codes_owner_insert"
on public.access_codes for insert
to authenticated
with check (
  owner_id = auth.uid()
  and app_private.owns_collection(collection_id)
);

create policy "access_codes_owner_read"
on public.access_codes for select
to authenticated
using (owner_id = auth.uid());

create policy "access_codes_owner_update"
on public.access_codes for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "access_codes_owner_delete"
on public.access_codes for delete
to authenticated
using (owner_id = auth.uid());

create policy "access_sessions_read_participant"
on public.access_sessions for select
to authenticated
using (
  recipient_id = auth.uid()
  or owner_id = auth.uid()
);

create policy "access_sessions_owner_revoke"
on public.access_sessions for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "media_keys_owner_insert"
on public.media_keys for insert
to authenticated
with check (
  exists (
    select 1
    from public.access_codes ac
    join public.media m on m.id = media_keys.media_id
    where ac.id = media_keys.access_code_id
      and ac.owner_id = auth.uid()
      and m.owner_id = auth.uid()
      and m.collection_id = ac.collection_id
  )
);

create policy "media_keys_owner_read"
on public.media_keys for select
to authenticated
using (
  exists (
    select 1
    from public.access_codes ac
    where ac.id = media_keys.access_code_id
      and ac.owner_id = auth.uid()
  )
);

create policy "media_keys_user_read_active"
on public.media_keys for select
to authenticated
using (
  revoked_at is null
  and (expires_at is null or expires_at > now())
  and exists (
    select 1
    from public.access_sessions s
    where s.access_code_id = media_keys.access_code_id
      and s.recipient_id = auth.uid()
      and s.revoked_at is null
      and (s.expires_at is null or s.expires_at > now())
  )
);

create policy "media_keys_owner_update"
on public.media_keys for update
to authenticated
using (
  exists (
    select 1
    from public.access_codes ac
    where ac.id = media_keys.access_code_id
      and ac.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.access_codes ac
    where ac.id = media_keys.access_code_id
      and ac.owner_id = auth.uid()
  )
);

create policy "audit_events_read_actor"
on public.audit_events for select
to authenticated
using (actor_id = auth.uid());

grant usage on schema public to anon, authenticated;
grant usage on schema app_private to authenticated;
grant execute on function app_private.owns_collection(uuid) to authenticated;
grant execute on function app_private.has_active_collection_access(uuid) to authenticated;
grant select, insert, update, delete on
  public.profiles,
  public.collections,
  public.media,
  public.access_codes,
  public.access_sessions,
  public.media_keys,
  public.audit_events,
  public.code_attempts
to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'encrypted-media',
  'encrypted-media',
  false,
  524288000,
  array['application/octet-stream']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "encrypted_media_owner_upload"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'encrypted-media'
  and right(name, 4) = '.enc'
  and (storage.foldername(name))[1] = 'owners'
  and (storage.foldername(name))[2] = auth.uid()::text
);

create policy "encrypted_media_owner_update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'encrypted-media'
  and (storage.foldername(name))[1] = 'owners'
  and (storage.foldername(name))[2] = auth.uid()::text
)
with check (
  bucket_id = 'encrypted-media'
  and right(name, 4) = '.enc'
  and (storage.foldername(name))[1] = 'owners'
  and (storage.foldername(name))[2] = auth.uid()::text
);

create policy "encrypted_media_owner_delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'encrypted-media'
  and (storage.foldername(name))[1] = 'owners'
  and (storage.foldername(name))[2] = auth.uid()::text
);

create policy "encrypted_media_read_owned_or_authorized"
on storage.objects for select
to authenticated
using (
  bucket_id = 'encrypted-media'
  and (
    (
      (storage.foldername(name))[1] = 'owners'
      and (storage.foldername(name))[2] = auth.uid()::text
    )
    or exists (
      select 1
      from public.media m
      where (
        m.encrypted_storage_path = storage.objects.name
        or m.thumbnail_encrypted_storage_path = storage.objects.name
      )
        and app_private.has_active_collection_access(m.collection_id)
    )
  )
);
