-- =====================================================================
-- OdonStock · Suppression des mouvements par l'administrateur
-- Une suppression annule automatiquement son effet (stock, total de scan posts).
-- À exécuter une seule fois dans Supabase : SQL Editor > New query > Run
-- =====================================================================

begin;

-- Seul l'administrateur peut supprimer un mouvement
create policy scan_post_mouvements_suppression on public.scan_post_mouvements
  for delete to authenticated using (public.mon_role() = 'admin');

create policy mouvements_suppression on public.mouvements
  for delete to authenticated using (public.mon_role() = 'admin');

-- Supprimer une perte de scan post la remet dans le total de sa taille
create or replace function public.annuler_perte_scan_post() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.type = 'perte' then
    update public.scan_post_tailles
       set quantite_totale = quantite_totale + old.quantite
     where id = old.taille_id;
  end if;
  return old;
end;
$$;

create trigger scan_post_perte_annulee
  after delete on public.scan_post_mouvements
  for each row execute function public.annuler_perte_scan_post();

-- Supprimer un mouvement de stock annule son effet sur le stock
create or replace function public.annuler_mouvement() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  ecart int := case old.type when 'sortie' then old.quantite else -old.quantite end;
begin
  update public.stocks
     set quantite = quantite + ecart,
         mis_a_jour_le = now()
   where centre_id = old.centre_id
     and produit_id = old.produit_id;
  return old;
end;
$$;

create trigger mouvements_annules
  after delete on public.mouvements
  for each row execute function public.annuler_mouvement();

commit;
