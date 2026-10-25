-- Trip tabs: itinerary, packing, links. Visible and editable only to trip members.

create table if not exists public.trip_itinerary_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  day date not null,
  title text not null check (char_length(title) between 1 and 120),
  time_label text check (char_length(time_label) <= 40),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.trip_packing_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 120),
  packed boolean not null default false,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.trip_links (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  kind text not null check (kind in ('lodging','transport','activity','other')),
  title text not null check (char_length(title) between 1 and 120),
  url text not null check (char_length(url) <= 2000),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.trip_itinerary_items enable row level security;
alter table public.trip_packing_items enable row level security;
alter table public.trip_links enable row level security;

create policy "trip members read itinerary" on public.trip_itinerary_items for select
  using (exists (select 1 from public.trip_members m where m.trip_id = trip_itinerary_items.trip_id and m.user_id = auth.uid()));
create policy "trip members write itinerary" on public.trip_itinerary_items for all
  using (exists (select 1 from public.trip_members m where m.trip_id = trip_itinerary_items.trip_id and m.user_id = auth.uid()))
  with check (exists (select 1 from public.trip_members m where m.trip_id = trip_itinerary_items.trip_id and m.user_id = auth.uid()) and created_by = auth.uid());

create policy "trip members read packing" on public.trip_packing_items for select
  using (exists (select 1 from public.trip_members m where m.trip_id = trip_packing_items.trip_id and m.user_id = auth.uid()));
create policy "trip members write packing" on public.trip_packing_items for all
  using (exists (select 1 from public.trip_members m where m.trip_id = trip_packing_items.trip_id and m.user_id = auth.uid()))
  with check (exists (select 1 from public.trip_members m where m.trip_id = trip_packing_items.trip_id and m.user_id = auth.uid()) and created_by = auth.uid());

create policy "trip members read links" on public.trip_links for select
  using (exists (select 1 from public.trip_members m where m.trip_id = trip_links.trip_id and m.user_id = auth.uid()));
create policy "trip members write links" on public.trip_links for all
  using (exists (select 1 from public.trip_members m where m.trip_id = trip_links.trip_id and m.user_id = auth.uid()))
  with check (exists (select 1 from public.trip_members m where m.trip_id = trip_links.trip_id and m.user_id = auth.uid()) and created_by = auth.uid());

-- Costs can now belong to a trip as well as an event.
alter table public.expenses add column if not exists trip_id uuid references public.trips(id) on delete cascade;
alter table public.settlements add column if not exists trip_id uuid references public.trips(id) on delete cascade;
alter table public.expenses alter column event_id drop not null;
alter table public.settlements alter column event_id drop not null;
alter table public.expenses add constraint expenses_one_scope check (num_nonnulls(event_id, trip_id) = 1);
alter table public.settlements add constraint settlements_one_scope check (num_nonnulls(event_id, trip_id) = 1);
