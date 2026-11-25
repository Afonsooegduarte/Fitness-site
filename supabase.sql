-- Tabelas para a versão online do Pulso (teste fechado).
-- Corre isto uma vez no Supabase: SQL Editor -> New query -> colar -> Run.

create table if not exists public.pulso_state (
  id text primary key,
  data jsonb not null,
  version bigint not null default 1,
  updated_at timestamptz not null default now()
);

create table if not exists public.pulso_blobs (
  id text primary key,
  data text not null,
  created_at timestamptz not null default now()
);

alter table public.pulso_state enable row level security;
alter table public.pulso_blobs enable row level security;

-- Sem login: quem tiver o link do site pode ler e escrever. Serve para um teste entre amigos, não para produção.
drop policy if exists "pulso_state anon all" on public.pulso_state;
create policy "pulso_state anon all" on public.pulso_state for all to anon using (true) with check (true);

drop policy if exists "pulso_blobs anon read" on public.pulso_blobs;
create policy "pulso_blobs anon read" on public.pulso_blobs for select to anon using (true);
drop policy if exists "pulso_blobs anon insert" on public.pulso_blobs;
create policy "pulso_blobs anon insert" on public.pulso_blobs for insert to anon with check (true);

grant select, insert, update on public.pulso_state to anon;
grant select, insert on public.pulso_blobs to anon;
