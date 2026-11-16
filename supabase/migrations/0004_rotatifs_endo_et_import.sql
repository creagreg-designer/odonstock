-- =====================================================================
-- OdonStock · Contre-angles endo et import du parc de rotatifs de Nice Trinité
-- Source : inventaire-rotatifs-tous-les-centres-2026-11-16.csv (28 rotatifs)
-- À exécuter une seule fois dans Supabase : SQL Editor > New query > Run
-- =====================================================================

begin;

-- Un type par moteur endo : les contre-angles ne sont pas interchangeables
insert into public.rotatif_types (nom, ordre) values
  ('CA endo – Reciproc', 7),
  ('CA endo – Woodpecker', 8),
  ('CA endo – FKG', 9)
on conflict (nom) do nothing;

-- Import du parc (CA rouge → Bague rouge, CA bleu → Bague bleue, PAM prothèse → PAM,
-- CA endo → CA endo – Reciproc). Un rotatif déjà présent n'est pas importé deux fois.
insert into public.rotatifs (centre_id, type_id, numero_serie, marque, modele, statut)
select c.id, t.id, v.numero_serie, v.marque, v.modele, v.statut
from (values
  ('Nice Trinité', 'Turbine', '260708028', 'MGY', 'DN-MYF MY-605', 'circulation'),
  ('Nice Trinité', 'Turbine', '260708079', 'MGY', 'DN-MYF MY-605', 'panne'),
  ('Nice Trinité', 'Turbine', '260330015', 'MGY', 'DN-MYF MY-605', 'panne'),
  ('Nice Trinité', 'Turbine', 'K503-0876', 'COXO', 'CX207-G', 'panne'),
  ('Nice Trinité', 'Turbine', '260708024', 'MGY', 'DN-MYF MY-605', 'circulation'),
  ('Nice Trinité', 'Turbine', '260708088', 'MGY', 'DN-MYF MY-605', 'circulation'),
  ('Nice Trinité', 'Turbine', '260708025', 'MGY', 'DN-MYF MY-605', 'circulation'),
  ('Nice Trinité', 'Bague rouge', '260701063', 'MGY', 'Super Max X-95L', 'circulation'),
  ('Nice Trinité', 'Bague rouge', '260513030', 'MGY', 'Super Max X-95L', 'circulation'),
  ('Nice Trinité', 'Bague rouge', '0C16-1387', '3TECH', 'YSENDENT CX235C7', 'panne'),
  ('Nice Trinité', 'Bague rouge', '02210916', 'NSK', 'S-MAX M95L', 'circulation'),
  ('Nice Trinité', 'Bague rouge', 'C2210959', 'NSK', 'S-MAX M95L', 'circulation'),
  ('Nice Trinité', 'Bague rouge', '022100959', 'NSK', 'S-MAX M95L', 'circulation'),
  ('Nice Trinité', 'Bague rouge', '260701001', 'MGY', 'Super Max X-95L', 'circulation'),
  ('Nice Trinité', 'Bague rouge', 'C2232009', 'NSK', 'S-MAX M95L', 'circulation'),
  ('Nice Trinité', 'Bague rouge', '260513026', 'MGY', 'Super Max X-95L', 'circulation'),
  ('Nice Trinité', 'Bague rouge', '260701018', 'MGY', 'Super Max X-95L', 'circulation'),
  ('Nice Trinité', 'Bague bleue', 'A22X0237', 'NSK', 'S-MAX M25L', 'circulation'),
  ('Nice Trinité', 'Bague bleue', 'A2220779', 'NSK', 'S-MAX M25L', 'panne'),
  ('Nice Trinité', 'Bague bleue', 'F22L21W482', '3TECH', null, 'circulation'),
  ('Nice Trinité', 'Bague bleue', 'F24L0201027', '3TECH', null, 'circulation'),
  ('Nice Trinité', 'Bague bleue', 'F22K01W191', '3TECH', null, 'panne'),
  ('Nice Trinité', 'Bague bleue', 'F25A0701194', '3TECH', null, 'circulation'),
  ('Nice Trinité', 'Bague bleue', 'F22L21W232', '3TECH', null, 'circulation'),
  ('Nice Trinité', 'Bague bleue', 'A2211325', 'NSK', 'S-MAX M25L', 'circulation'),
  ('Nice Trinité', 'CA endo – Reciproc', '174433', 'VDW', null, 'circulation'),
  ('Nice Trinité', 'CA endo – Reciproc', '174420', 'VDW', null, 'circulation'),
  ('Nice Trinité', 'PAM', 'MC04-4799', 'COXO', 'CX 235-2G', 'circulation')
) as v(centre, type, numero_serie, marque, modele, statut)
join public.centres c on c.nom = v.centre
join public.rotatif_types t on t.nom = v.type
on conflict (type_id, numero_serie) do nothing;

commit;
