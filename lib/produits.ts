// Produits visibles par le centre, avec leur stock actuel (en unités de sortie)
import type { SupabaseClient } from "@supabase/supabase-js";

export type ProduitStock = {
  id: string;
  nom: string;
  reference: string | null;
  uniteAchat: string;
  uniteSortie: string;
  parAchat: number;
  contenu: number | null;
  uniteContenu: string | null;
  stock: number;
};

export async function produitsAvecStock(supabase: SupabaseClient, centreId: string): Promise<ProduitStock[]> {
  const [{ data: produits }, { data: stocks }] = await Promise.all([
    supabase
      .from("produits")
      .select("id, nom, reference, unite_achat, unite_sortie, sorties_par_achat, contenu_sortie, unite_contenu")
      .eq("actif", true)
      .order("nom"),
    supabase.from("stocks").select("produit_id, quantite").eq("centre_id", centreId),
  ]);
  const stockPar = new Map((stocks ?? []).map((s) => [s.produit_id as string, s.quantite as number]));
  return (produits ?? []).map((p) => ({
    id: p.id,
    nom: p.nom,
    reference: p.reference,
    uniteAchat: p.unite_achat,
    uniteSortie: p.unite_sortie,
    parAchat: p.sorties_par_achat,
    contenu: p.contenu_sortie,
    uniteContenu: p.unite_contenu,
    stock: stockPar.get(p.id) ?? 0,
  }));
}
