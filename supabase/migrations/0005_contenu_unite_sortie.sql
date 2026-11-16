-- =====================================================================
-- OdonStock · Contenu de l'unité de sortie (facultatif)
-- Exemple : une plaquette contient 10 carpules.
-- À exécuter une seule fois dans Supabase : SQL Editor > New query > Run
-- =====================================================================

alter table public.produits
  add column contenu_sortie int check (contenu_sortie >= 1),
  add column unite_contenu text;
