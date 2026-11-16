"use server";

import { redirect } from "next/navigation";
import { creerClientServeur } from "@/lib/supabase/server";
import { lireProfil } from "@/lib/profil";

export type Resultat = { ok: boolean; message: string };

// Enregistre un comptage : l'écart est calculé sur le stock au moment de la validation,
// puis corrigé par un mouvement « ajustement ».
export async function enregistrerInventaire(
  categorieId: string | null,
  lignes: { produitId: string; compte: number }[],
): Promise<Resultat> {
  const profil = await lireProfil();
  if (!profil?.centre_id) return { ok: false, message: "Votre compte n'est rattaché à aucun centre." };
  const comptes = lignes.filter((l) => Number.isInteger(l.compte) && l.compte >= 0);
  if (!comptes.length) return { ok: false, message: "Aucun produit n'a été compté." };

  const supabase = await creerClientServeur();
  const { data: stocks } = await supabase
    .from("stocks")
    .select("produit_id, quantite")
    .eq("centre_id", profil.centre_id)
    .in("produit_id", comptes.map((l) => l.produitId));
  const actuel = new Map((stocks ?? []).map((s) => [s.produit_id as string, s.quantite as number]));

  const { data: inventaire, error } = await supabase
    .from("inventaires")
    .insert({ centre_id: profil.centre_id, categorie_id: categorieId })
    .select("id")
    .single();
  if (error || !inventaire) return { ok: false, message: "L'inventaire n'a pas pu être enregistré. Réessayez." };

  const details = comptes.map((l) => ({
    inventaire_id: inventaire.id,
    produit_id: l.produitId,
    theorique: actuel.get(l.produitId) ?? 0,
    compte: l.compte,
  }));
  const { error: erreurLignes } = await supabase.from("inventaire_lignes").insert(details);
  if (erreurLignes) return { ok: false, message: "Le détail de l'inventaire n'a pas pu être enregistré." };

  const ajustements = details
    .filter((d) => d.compte !== d.theorique)
    .map((d) => ({
      centre_id: profil.centre_id,
      produit_id: d.produit_id,
      type: "ajustement",
      quantite: d.compte - d.theorique,
      note: "Inventaire",
    }));
  if (ajustements.length) {
    const { error: erreurStock } = await supabase.from("mouvements").insert(ajustements);
    if (erreurStock) return { ok: false, message: "Les écarts n'ont pas pu être appliqués au stock." };
  }

  redirect(`/inventaire?fait=${comptes.length}-${ajustements.length}`);
}
