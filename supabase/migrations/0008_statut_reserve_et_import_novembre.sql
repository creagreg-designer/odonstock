-- 1) Nouveau statut « En réserve » : rotatif en bon état, rangé, pas en circulation
alter table public.rotatifs drop constraint if exists rotatifs_statut_check;
alter table public.rotatifs add constraint rotatifs_statut_check
  check (statut in ('circulation', 'reserve', 'panne', 'reparation', 'hors_service'));

-- 2) Numéro de série facultatif (ex. PAM US sur lesquels on ne peut rien coller).
--    Un numéro saisi reste unique par type ; plusieurs rotatifs peuvent être sans numéro.
alter table public.rotatifs alter column numero_serie drop not null;

-- 3) Import des rotatifs reçus le 02/11/26 à Nice Trinité
insert into public.rotatifs (centre_id, type_id, numero_serie, marque, modele, statut, cree_le)
select c.id, t.id, v.numero_serie, 'MGY', v.modele, v.statut, '2026-11-02 12:00+01'
from (values
  ('Bague rouge', '261009026', 'X95L', 'circulation'),
  ('Bague rouge', '261009015', 'X95L', 'circulation'),
  ('Bague rouge', '261009019', 'X95L', 'circulation'),
  ('Bague rouge', '261009014', 'X95L', 'circulation'),
  ('Bague rouge', '261009012', 'X95L', 'circulation'),
  ('Bague rouge', '261009013', 'X95L', 'circulation'),
  ('Bague rouge', '261009006', 'X95L', 'circulation'),
  ('Bague rouge', '261009025', 'X95L', 'circulation'),
  ('Bague rouge', '261009002', 'X95L', 'circulation'),
  ('Bague rouge', '261009030', 'X95L', 'circulation'),
  ('Turbine', '261012030', 'MY-605', 'circulation'),
  ('Turbine', '261012013', 'MY-605', 'circulation'),
  ('Turbine', '261012005', 'MY-605', 'circulation'),
  ('Turbine', '261012038', 'MY-605', 'circulation'),
  ('Turbine', '261012025', 'MY-605', 'circulation'),
  ('Turbine', '261012012', 'MY-605', 'circulation'),
  ('Turbine', '261012020', 'MY-605', 'circulation'),
  ('Turbine', '261012003', 'MY-605', 'circulation'),
  ('Turbine', '261012002', 'MY-605', 'circulation'),
  ('Turbine', '261012004', 'MY-605', 'circulation'),
  ('Bague bleue', '261009003', 'X25L', 'circulation'),
  ('Bague bleue', '261009015', 'X25L', 'circulation'),
  ('Bague bleue', '261009001', 'X25L', 'circulation'),
  ('Bague bleue', '261009004', 'X25L', 'circulation'),
  ('Bague bleue', '261009012', 'X25L', 'circulation'),
  ('Bague verte', '261009002', 'SG20L', 'reserve'),
  ('Bague verte', '261009004', 'SG20L', 'reserve')
) as v(type, numero_serie, modele, statut)
join public.centres c on c.nom = 'Nice Trinité'
join public.rotatif_types t on t.nom = v.type
on conflict (type_id, numero_serie) do nothing;

-- 15 PAM US (détartreurs DTE HD-7H), sans numéro de série, en réserve.
-- Le « where not exists » évite de les créer deux fois si ce fichier est relancé.
insert into public.rotatifs (centre_id, type_id, numero_serie, marque, modele, statut, cree_le)
select c.id, t.id, null, 'DTE', 'HD-7H', 'reserve', '2026-11-02 12:00+01'
from public.centres c
join public.rotatif_types t on t.nom = 'PAM US'
cross join generate_series(1, 15)
where c.nom = 'Nice Trinité'
  and not exists (
    select 1 from public.rotatifs r
    where r.centre_id = c.id and r.type_id = t.id and r.modele = 'HD-7H' and r.numero_serie is null
  );
