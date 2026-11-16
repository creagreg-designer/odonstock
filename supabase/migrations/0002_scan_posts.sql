-- =====================================================================
-- OdonStock · Scan posts : tailles, assistantes et calcul des emprunts en cours
-- À exécuter une seule fois dans Supabase : SQL Editor > New query > Run
-- =====================================================================

begin;

-- Les assistantes sont enregistrées par leur prénom ; le nom devient facultatif
alter table public.personnes alter column nom drop not null;

-- Scan posts actuellement empruntés, par assistante et par taille
create view public.scan_posts_en_cours with (security_invoker = true) as
select
  m.centre_id,
  m.personne_id,
  m.taille_id,
  sum(case m.type when 'emprunt' then m.quantite else -m.quantite end)::int as quantite,
  max(m.cree_le) filter (where m.type = 'emprunt') as dernier_emprunt
from public.scan_post_mouvements m
group by m.centre_id, m.personne_id, m.taille_id
having sum(case m.type when 'emprunt' then m.quantite else -m.quantite end) > 0;

grant select on public.scan_posts_en_cours to authenticated;

-- Une perte retire automatiquement le scan post du total de sa taille
create or replace function public.appliquer_perte_scan_post() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.type = 'perte' then
    update public.scan_post_tailles
       set quantite_totale = greatest(quantite_totale - new.quantite, 0)
     where id = new.taille_id;
  end if;
  return new;
end;
$$;

create trigger scan_post_perte
  after insert on public.scan_post_mouvements
  for each row execute function public.appliquer_perte_scan_post();

-- Tailles et quantités de Nice Trinité
insert into public.scan_post_tailles (centre_id, nom, quantite_totale, ordre)
select c.id, t.nom, t.quantite, t.ordre
from public.centres c,
     (values ('PL 1.2', 7, 1), ('PL 1.3', 9, 2), ('PL 1.4', 5, 3),
             ('PL 1.5', 6, 4), ('PL 1.6', 4, 5)) as t(nom, quantite, ordre)
where c.nom = 'Nice Trinité';

-- Assistantes de Nice Trinité
insert into public.personnes (centre_id, prenom)
select c.id, p.prenom
from public.centres c,
     (values ('Théo'), ('Edna'), ('Elisa'), ('Linda'), ('Véronique'), ('Jennifer'),
             ('Alexia'), ('Tiffany'), ('Morgane'), ('Natali'), ('Greg')) as p(prenom)
where c.nom = 'Nice Trinité';

commit;
