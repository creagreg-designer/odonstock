-- =====================================================================
-- OdonStock · Inventaires (comptages et écarts)
-- À exécuter une seule fois dans Supabase : SQL Editor > New query > Run
-- =====================================================================

begin;

-- Un comptage : une zone (catégorie) ou tout le stock si categorie_id est vide
create table public.inventaires (
  id uuid primary key default gen_random_uuid(),
  centre_id uuid not null references public.centres(id) on delete cascade,
  categorie_id uuid references public.categories(id),
  cree_par uuid references auth.users(id) default auth.uid(),
  cree_le timestamptz not null default now()
);

-- Une ligne par produit compté (quantités en unités de sortie)
create table public.inventaire_lignes (
  id uuid primary key default gen_random_uuid(),
  inventaire_id uuid not null references public.inventaires(id) on delete cascade,
  produit_id uuid not null references public.produits(id),
  theorique int not null,
  compte int not null check (compte >= 0),
  ecart int generated always as (compte - theorique) stored
);

create index inventaires_recherche on public.inventaires (centre_id, cree_le desc);

alter table public.inventaires enable row level security;
alter table public.inventaire_lignes enable row level security;

create policy inventaires_lecture on public.inventaires for select to authenticated
  using (public.dans_mon_centre(centre_id));
create policy inventaires_ajout on public.inventaires for insert to authenticated
  with check (public.mon_role() = 'admin' or centre_id = public.mon_centre());
create policy inventaires_suppression on public.inventaires for delete to authenticated
  using (public.mon_role() = 'admin');

create policy inventaire_lignes_lecture on public.inventaire_lignes for select to authenticated
  using (exists (select 1 from public.inventaires i where i.id = inventaire_id and public.dans_mon_centre(i.centre_id)));
create policy inventaire_lignes_ajout on public.inventaire_lignes for insert to authenticated
  with check (exists (select 1 from public.inventaires i
                      where i.id = inventaire_id
                        and (public.mon_role() = 'admin' or i.centre_id = public.mon_centre())));

grant select, insert, delete on public.inventaires, public.inventaire_lignes to authenticated;

commit;
