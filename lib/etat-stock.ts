// Lignes de l'état du stock d'un centre : stock, seuil, état et valeur
import type { SupabaseClient } from "@supabase/supabase-js";
import { nomDe } from "./profil";

export type Etat = "rupture" | "faible" | "ok";
export type LigneStock = {
  id: string;
  nom: string;
  reference: string | null;
  categorieId: string | null;
  categorie: string | null;
  uniteAchat: string;
  uniteSortie: string;
  parAchat: number;
  prix: number | null;
  stock: number;
  seuil: number | null;
  etat: Etat;
  valeur: number;
};

export const ETATS: Record<Etat, { label: string; classes: string }> = {
  rupture: { label: "Rupture", classes: "bg-[#FDECE3] text-[#9A3412]" },
  faible: { label: "Sous le seuil", classes: "bg-[#FEF3C7] text-[#854D0E]" },
  ok: { label: "En stock", classes: "bg-[#E3F4EA] text-[#166534]" },
};

export async function lireEtatStock(supabase: SupabaseClient, centreId: string): Promise<LigneStock[]> {
  const [{ data: produits }, { data: stocks }] = await Promise.all([
    supabase
      .from("produits")
      .select("id, nom, reference, categorie_id, unite_achat, unite_sortie, sorties_par_achat, prix_achat, categories(nom)")
      .eq("actif", true)
      .order("nom"),
    supabase
      .from("stocks")
      .select("produit_id, quantite, seuil_manuel, seuil_auto, seuil_automatique")
      .eq("centre_id", centreId),
  ]);
  const parProduit = new Map((stocks ?? []).map((s) => [s.produit_id as string, s]));

  return (produits ?? []).map((p) => {
    const s = parProduit.get(p.id);
    const stock = (s?.quantite as number) ?? 0;
    const seuil = (s ? (s.seuil_automatique ? s.seuil_auto : s.seuil_manuel) : null) as number | null;
    const etat: Etat = stock <= 0 ? "rupture" : seuil != null && stock <= seuil ? "faible" : "ok";
    const prix = p.prix_achat == null ? null : Number(p.prix_achat);
    return {
      id: p.id,
      nom: p.nom,
      reference: p.reference,
      categorieId: p.categorie_id,
      categorie: nomDe(p.categories),
      uniteAchat: p.unite_achat,
      uniteSortie: p.unite_sortie,
      parAchat: p.sorties_par_achat,
      prix,
      stock,
      seuil,
      etat,
      valeur: prix != null && stock > 0 ? (stock / p.sorties_par_achat) * prix : 0,
    };
  });
}
