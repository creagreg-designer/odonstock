-- =====================================================================
-- OdonStock · Base de données · version 1
-- À exécuter une seule fois dans Supabase : SQL Editor > New query > Run
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. Centres et lieux de sortie
-- ---------------------------------------------------------------------
create table public.centres (
  id uuid primary key default gen_random_uuid(),
  nom text not null unique,
  actif boolean not null default true,
  cree_le timestamptz not null default now()
);

-- Cabinets, stérilisation, bloc… : destinations des sorties, sans stock propre
create table public.lieux (
  id uuid primary key default gen_random_uuid(),
  centre_id uuid not null references public.centres(id) on delete cascade,
  nom text not null,
  ordre int not null default 0,
  actif boolean not null default true,
  unique (centre_id, nom)
);

-- ---------------------------------------------------------------------
-- 2. Utilisateurs et rôles
-- ---------------------------------------------------------------------
create table public.profils (
  id uuid primary key references auth.users(id) on delete cascade,
  nom text,
  role text not null default 'poste'
    check (role in ('admin', 'direction', 'responsable', 'poste')),
  centre_id uuid references public.centres(id),
  cree_le timestamptz not null default now()
);

-- Fonctions utilisées par les règles d'accès
create or replace function public.mon_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.profils where id = auth.uid()
$$;

create or replace function public.mon_centre() returns uuid
language sql stable security definer set search_path = public as $$
  select centre_id from public.profils where id = auth.uid()
$$;

-- Admin et direction voient tous les centres
create or replace function public.voit_tout() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.mon_role() in ('admin', 'direction'), false)
$$;

-- Lecture : son propre centre, ou tous pour admin et direction
create or replace function public.dans_mon_centre(c uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.voit_tout() or c = public.mon_centre()
$$;

-- Gestion : admin et direction partout, responsable dans son centre
create or replace function public.gere_centre(c uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.voit_tout()
      or (public.mon_role() = 'responsable' and c = public.mon_centre())
$$;

-- Chaque nouveau compte reçoit un profil « poste », sans centre (aucun accès)
-- jusqu'à ce que l'administrateur lui attribue un rôle et un centre.
create or replace function public.nouvel_utilisateur() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profils (id, nom)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'nom', new.email));
  return new;
end;
$$;

create trigger a_la_creation_utilisateur
  after insert on auth.users
  for each row execute function public.nouvel_utilisateur();

-- ---------------------------------------------------------------------
-- 3. Catalogue
-- ---------------------------------------------------------------------
-- Catégories communes au groupe, sur deux niveaux (parent_id = sous-catégorie)
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  parent_id uuid references public.categories(id) on delete restrict,
  ordre int not null default 0,
  unique nulls not distinct (parent_id, nom)
);

create table public.fournisseurs (
  id uuid primary key default gen_random_uuid(),
  nom text not null unique,
  delai_jours int not null default 10 check (delai_jours > 0),
  minimum_commande numeric(10, 2),
  actif boolean not null default true
);

-- centre_id vide = catalogue commun du groupe ; rempli = référence locale
create table public.produits (
  id uuid primary key default gen_random_uuid(),
  reference text,
  nom text not null,
  categorie_id uuid references public.categories(id),
  fournisseur_id uuid references public.fournisseurs(id),
  unite_achat text not null default 'boîte',        -- ce qu'on commande
  unite_sortie text not null default 'boîte',       -- ce qu'un scan retire
  sorties_par_achat int not null default 1 check (sorties_par_achat >= 1),
  prix_achat numeric(10, 2) check (prix_achat >= 0), -- prix d'une unité d'achat
  centre_id uuid references public.centres(id) on delete cascade,
  actif boolean not null default true,
  cree_le timestamptz not null default now()
);

create unique index produits_reference_unique
  on public.produits (centre_id, reference) nulls not distinct
  where reference is not null;

-- ---------------------------------------------------------------------
-- 4. Stock (toujours compté en unités de sortie)
-- ---------------------------------------------------------------------
create table public.stocks (
  centre_id uuid not null references public.centres(id) on delete cascade,
  produit_id uuid not null references public.produits(id) on delete cascade,
  quantite int not null default 0,
  seuil_manuel int check (seuil_manuel >= 0),
  seuil_auto int check (seuil_auto >= 0),
  seuil_automatique boolean not null default false,
  mis_a_jour_le timestamptz not null default now(),
  primary key (centre_id, produit_id)
);

-- ---------------------------------------------------------------------
-- 5. Commandes
-- ---------------------------------------------------------------------
create table public.commandes (
  id uuid primary key default gen_random_uuid(),
  centre_id uuid not null references public.centres(id) on delete cascade,
  type text not null check (type in ('mensuelle', 'reassort', 'urgence')),
  statut text not null default 'proposee'
    check (statut in ('proposee', 'validee', 'recue_partielle', 'recue', 'annulee')),
  validee_le timestamptz,
  cree_par uuid references auth.users(id) default auth.uid(),
  cree_le timestamptz not null default now()
);

-- Quantités en unités d'achat (boîtes)
create table public.commande_lignes (
  id uuid primary key default gen_random_uuid(),
  commande_id uuid not null references public.commandes(id) on delete cascade,
  produit_id uuid not null references public.produits(id),
  quantite_proposee int,
  quantite_commandee int not null check (quantite_commandee > 0),
  quantite_recue int not null default 0 check (quantite_recue >= 0),
  prix_unitaire numeric(10, 2),
  ponctuel boolean not null default false,  -- demande particulière : hors consommation et seuils
  note text
);

-- ---------------------------------------------------------------------
-- 6. Mouvements de stock (historique, jamais modifié ni supprimé)
-- ---------------------------------------------------------------------
create table public.mouvements (
  id uuid primary key default gen_random_uuid(),
  centre_id uuid not null references public.centres(id) on delete cascade,
  produit_id uuid not null references public.produits(id),
  type text not null check (type in ('entree', 'sortie', 'ajustement')),
  quantite int not null,                       -- en unités de sortie
  lieu_id uuid references public.lieux(id),    -- destination d'une sortie
  commande_id uuid references public.commandes(id),
  utilisateur_id uuid references auth.users(id) default auth.uid(),
  note text,
  cree_le timestamptz not null default now(),
  check (
    (type in ('entree', 'sortie') and quantite > 0)
    or (type = 'ajustement' and quantite <> 0)
  )
);

create index mouvements_recherche on public.mouvements (centre_id, produit_id, cree_le desc);

-- Chaque mouvement met le stock à jour automatiquement
create or replace function public.appliquer_mouvement() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  ecart int := case new.type when 'sortie' then -new.quantite else new.quantite end;
begin
  insert into public.stocks (centre_id, produit_id, quantite)
  values (new.centre_id, new.produit_id, ecart)
  on conflict (centre_id, produit_id)
  do update set quantite = public.stocks.quantite + excluded.quantite,
                mis_a_jour_le = now();
  return new;
end;
$$;

create trigger mouvements_vers_stock
  after insert on public.mouvements
  for each row execute function public.appliquer_mouvement();

-- ---------------------------------------------------------------------
-- 7. Scan posts
-- ---------------------------------------------------------------------
-- Assistantes du centre (nom et prénom affichés lors des emprunts)
create table public.personnes (
  id uuid primary key default gen_random_uuid(),
  centre_id uuid not null references public.centres(id) on delete cascade,
  prenom text not null,
  nom text not null,
  actif boolean not null default true
);

create table public.scan_post_tailles (
  id uuid primary key default gen_random_uuid(),
  centre_id uuid not null references public.centres(id) on delete cascade,
  nom text not null,
  quantite_totale int not null default 0 check (quantite_totale >= 0),
  ordre int not null default 0,
  unique (centre_id, nom)
);

create table public.scan_post_mouvements (
  id uuid primary key default gen_random_uuid(),
  centre_id uuid not null references public.centres(id) on delete cascade,
  lot_id uuid not null default gen_random_uuid(),  -- regroupe un emprunt de plusieurs tailles
  personne_id uuid not null references public.personnes(id),
  taille_id uuid not null references public.scan_post_tailles(id),
  type text not null check (type in ('emprunt', 'retour', 'perte')),
  quantite int not null check (quantite > 0),
  utilisateur_id uuid references auth.users(id) default auth.uid(),
  cree_le timestamptz not null default now()
);

create index scan_post_recherche on public.scan_post_mouvements (centre_id, cree_le desc);

-- ---------------------------------------------------------------------
-- 8. Rotatifs
-- ---------------------------------------------------------------------
create table public.rotatif_types (
  id uuid primary key default gen_random_uuid(),
  nom text not null unique,
  ordre int not null default 0
);

-- Un rotatif est identifié par son type ET son numéro de série
create table public.rotatifs (
  id uuid primary key default gen_random_uuid(),
  centre_id uuid not null references public.centres(id) on delete cascade,
  type_id uuid not null references public.rotatif_types(id),
  numero_serie text not null,
  marque text,
  modele text,
  statut text not null default 'circulation'
    check (statut in ('circulation', 'panne', 'reparation', 'hors_service')),
  cree_le timestamptz not null default now(),
  unique (type_id, numero_serie)
);

-- Nombre de rotatifs nécessaires par type et par centre
create table public.rotatif_objectifs (
  centre_id uuid not null references public.centres(id) on delete cascade,
  type_id uuid not null references public.rotatif_types(id) on delete cascade,
  objectif int not null check (objectif >= 0),
  primary key (centre_id, type_id)
);

create table public.reparations (
  id uuid primary key default gen_random_uuid(),
  rotatif_id uuid not null references public.rotatifs(id) on delete cascade,
  envoye_le date not null default current_date,
  reparateur text,
  cout numeric(10, 2),
  retour_le date,
  note text
);

-- ---------------------------------------------------------------------
-- 9. Règles d'accès (chacun ne voit que ce qui le concerne)
-- ---------------------------------------------------------------------
alter table public.centres              enable row level security;
alter table public.lieux                enable row level security;
alter table public.profils              enable row level security;
alter table public.categories           enable row level security;
alter table public.fournisseurs         enable row level security;
alter table public.produits             enable row level security;
alter table public.stocks               enable row level security;
alter table public.commandes            enable row level security;
alter table public.commande_lignes      enable row level security;
alter table public.mouvements           enable row level security;
alter table public.personnes            enable row level security;
alter table public.scan_post_tailles    enable row level security;
alter table public.scan_post_mouvements enable row level security;
alter table public.rotatif_types        enable row level security;
alter table public.rotatifs             enable row level security;
alter table public.rotatif_objectifs    enable row level security;
alter table public.reparations          enable row level security;

-- Centres
create policy centres_lecture on public.centres for select to authenticated
  using (public.dans_mon_centre(id));
create policy centres_gestion on public.centres for all to authenticated
  using (public.mon_role() = 'admin') with check (public.mon_role() = 'admin');

-- Profils
create policy profils_lecture on public.profils for select to authenticated
  using (id = auth.uid() or public.voit_tout());
create policy profils_gestion on public.profils for all to authenticated
  using (public.mon_role() = 'admin') with check (public.mon_role() = 'admin');

-- Données communes au groupe : lecture pour tous, gestion admin et direction
create policy categories_lecture on public.categories for select to authenticated using (true);
create policy categories_gestion on public.categories for all to authenticated
  using (public.voit_tout()) with check (public.voit_tout());

create policy fournisseurs_lecture on public.fournisseurs for select to authenticated using (true);
create policy fournisseurs_gestion on public.fournisseurs for all to authenticated
  using (public.voit_tout()) with check (public.voit_tout());

create policy rotatif_types_lecture on public.rotatif_types for select to authenticated using (true);
create policy rotatif_types_gestion on public.rotatif_types for all to authenticated
  using (public.voit_tout()) with check (public.voit_tout());

-- Produits : catalogue commun visible par tous, références locales par centre
create policy produits_lecture on public.produits for select to authenticated
  using (centre_id is null or public.dans_mon_centre(centre_id));
create policy produits_gestion on public.produits for all to authenticated
  using (public.voit_tout() or (centre_id is not null and public.gere_centre(centre_id)))
  with check (public.voit_tout() or (centre_id is not null and public.gere_centre(centre_id)));

-- Données d'un centre : lecture dans le centre, gestion par le responsable
create policy lieux_lecture on public.lieux for select to authenticated
  using (public.dans_mon_centre(centre_id));
create policy lieux_gestion on public.lieux for all to authenticated
  using (public.gere_centre(centre_id)) with check (public.gere_centre(centre_id));

create policy stocks_lecture on public.stocks for select to authenticated
  using (public.dans_mon_centre(centre_id));
create policy stocks_gestion on public.stocks for all to authenticated
  using (public.gere_centre(centre_id)) with check (public.gere_centre(centre_id));

create policy commandes_lecture on public.commandes for select to authenticated
  using (public.dans_mon_centre(centre_id));
create policy commandes_gestion on public.commandes for all to authenticated
  using (public.gere_centre(centre_id)) with check (public.gere_centre(centre_id));

create policy commande_lignes_lecture on public.commande_lignes for select to authenticated
  using (exists (select 1 from public.commandes c
                 where c.id = commande_id and public.dans_mon_centre(c.centre_id)));
create policy commande_lignes_gestion on public.commande_lignes for all to authenticated
  using (exists (select 1 from public.commandes c
                 where c.id = commande_id and public.gere_centre(c.centre_id)))
  with check (exists (select 1 from public.commandes c
                      where c.id = commande_id and public.gere_centre(c.centre_id)));

create policy personnes_lecture on public.personnes for select to authenticated
  using (public.dans_mon_centre(centre_id));
create policy personnes_gestion on public.personnes for all to authenticated
  using (public.gere_centre(centre_id)) with check (public.gere_centre(centre_id));

create policy scan_post_tailles_lecture on public.scan_post_tailles for select to authenticated
  using (public.dans_mon_centre(centre_id));
create policy scan_post_tailles_gestion on public.scan_post_tailles for all to authenticated
  using (public.gere_centre(centre_id)) with check (public.gere_centre(centre_id));

create policy rotatifs_lecture on public.rotatifs for select to authenticated
  using (public.dans_mon_centre(centre_id));
create policy rotatifs_gestion on public.rotatifs for all to authenticated
  using (public.gere_centre(centre_id)) with check (public.gere_centre(centre_id));

create policy rotatif_objectifs_lecture on public.rotatif_objectifs for select to authenticated
  using (public.dans_mon_centre(centre_id));
create policy rotatif_objectifs_gestion on public.rotatif_objectifs for all to authenticated
  using (public.gere_centre(centre_id)) with check (public.gere_centre(centre_id));

create policy reparations_lecture on public.reparations for select to authenticated
  using (exists (select 1 from public.rotatifs r
                 where r.id = rotatif_id and public.dans_mon_centre(r.centre_id)));
create policy reparations_gestion on public.reparations for all to authenticated
  using (exists (select 1 from public.rotatifs r
                 where r.id = rotatif_id and public.gere_centre(r.centre_id)))
  with check (exists (select 1 from public.rotatifs r
                      where r.id = rotatif_id and public.gere_centre(r.centre_id)));

-- Historiques : tout le centre peut ajouter (poste compris), personne ne modifie ni ne supprime
create policy mouvements_lecture on public.mouvements for select to authenticated
  using (public.dans_mon_centre(centre_id));
create policy mouvements_ajout on public.mouvements for insert to authenticated
  with check (public.mon_role() = 'admin' or centre_id = public.mon_centre());

create policy scan_post_mouvements_lecture on public.scan_post_mouvements for select to authenticated
  using (public.dans_mon_centre(centre_id));
create policy scan_post_mouvements_ajout on public.scan_post_mouvements for insert to authenticated
  with check (public.mon_role() = 'admin' or centre_id = public.mon_centre());

-- Accès des utilisateurs connectés (les règles ci-dessus filtrent les lignes)
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on function public.mon_role(), public.mon_centre(), public.voit_tout(),
  public.dans_mon_centre(uuid), public.gere_centre(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 10. Données de départ
-- ---------------------------------------------------------------------
insert into public.centres (nom) values ('Nice Trinité');

insert into public.lieux (centre_id, nom, ordre)
select c.id, l.nom, l.ordre
from public.centres c,
     (values ('Cabinet 1', 1), ('Cabinet 2', 2), ('Cabinet 3', 3), ('Cabinet 4', 4),
             ('Cabinet 5', 5), ('Cabinet 6', 6), ('Cabinet 7', 7), ('Cabinet 8', 8),
             ('Cabinet 9', 9), ('Cabinet 10', 10), ('Stérilisation', 11),
             ('Bloc', 12), ('Salle radio', 13)) as l(nom, ordre)
where c.nom = 'Nice Trinité';

insert into public.categories (nom, ordre) values
  ('Anesthésie', 1),
  ('Hygiène et protection', 2),
  ('Consommables de stérilisation', 3),
  ('Usage unique', 4),
  ('Restauration', 5),
  ('Endodontie', 6),
  ('Empreintes et prothèse', 7),
  ('Chirurgie et implantologie', 8),
  ('Prophylaxie et parodontie', 9),
  ('Radiologie', 10),
  ('Fournitures générales', 11);

insert into public.rotatif_types (nom, ordre) values
  ('Turbine', 1), ('Bague rouge', 2), ('Bague bleue', 3),
  ('Bague verte', 4), ('PAM', 5), ('PAM US', 6);

commit;
