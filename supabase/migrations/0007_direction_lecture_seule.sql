-- =====================================================================
-- OdonStock · Rôle « direction » en lecture seule
-- La direction voit tout (tous les centres, les montants) mais ne modifie rien.
-- À exécuter une seule fois dans Supabase : SQL Editor > New query > Run
-- =====================================================================

begin;

-- Gestion d'un centre : administrateur partout, responsable dans son centre (plus la direction)
create or replace function public.gere_centre(c uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.mon_role() = 'admin'
      or (public.mon_role() = 'responsable' and c = public.mon_centre())
$$;

-- Ajouts du quotidien (sorties, réceptions, emprunts, inventaires) : tout le centre sauf la direction
create or replace function public.peut_saisir(c uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.mon_role() = 'admin'
      or (public.mon_role() in ('responsable', 'poste') and c = public.mon_centre())
$$;
grant execute on function public.peut_saisir(uuid) to authenticated;

-- Données communes au groupe : modifiables par l'administrateur seulement
drop policy categories_gestion on public.categories;
create policy categories_gestion on public.categories for all to authenticated
  using (public.mon_role() = 'admin') with check (public.mon_role() = 'admin');

drop policy fournisseurs_gestion on public.fournisseurs;
create policy fournisseurs_gestion on public.fournisseurs for all to authenticated
  using (public.mon_role() = 'admin') with check (public.mon_role() = 'admin');

drop policy rotatif_types_gestion on public.rotatif_types;
create policy rotatif_types_gestion on public.rotatif_types for all to authenticated
  using (public.mon_role() = 'admin') with check (public.mon_role() = 'admin');

drop policy produits_gestion on public.produits;
create policy produits_gestion on public.produits for all to authenticated
  using (public.mon_role() = 'admin' or (centre_id is not null and public.gere_centre(centre_id)))
  with check (public.mon_role() = 'admin' or (centre_id is not null and public.gere_centre(centre_id)));

-- Saisies du quotidien
drop policy mouvements_ajout on public.mouvements;
create policy mouvements_ajout on public.mouvements for insert to authenticated
  with check (public.peut_saisir(centre_id));

drop policy scan_post_mouvements_ajout on public.scan_post_mouvements;
create policy scan_post_mouvements_ajout on public.scan_post_mouvements for insert to authenticated
  with check (public.peut_saisir(centre_id));

drop policy inventaires_ajout on public.inventaires;
create policy inventaires_ajout on public.inventaires for insert to authenticated
  with check (public.peut_saisir(centre_id));

drop policy inventaire_lignes_ajout on public.inventaire_lignes;
create policy inventaire_lignes_ajout on public.inventaire_lignes for insert to authenticated
  with check (exists (select 1 from public.inventaires i
                      where i.id = inventaire_id and public.peut_saisir(i.centre_id)));

commit;
