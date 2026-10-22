create table if not exists public.saved_auth (
  id text primary key,
  username text,
  password text,
  server text,
  auto_login boolean default true,
  saved_at timestamptz default now()
);

alter table public.saved_auth enable row level security;

create policy if not exists "allow_server_write"
  on public.saved_auth
  for all
  using (true)
  with check (true);

create policy if not exists "allow_server_read"
  on public.saved_auth
  for select
  using (true);
