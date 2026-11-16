"use server";

import { refresh } from "next/cache";
import { creerClientServeur } from "@/lib/supabase/server";
import { lireProfil } from "@/lib/profil";

export type Resultat = { ok: boolean; message: string };

export async function enregistrerSortie(
  lieuId: string,
  lignes: { produitId: string; quantite: number }[],
): Promise<Resultat> {
  const profil = await lireProfil();
  if (!profil?.centre_id) return { ok: false, message: "Votre compte n'est rattaché à aucun centre." };
  const valides = lignes.filter((l) => Number.isInteger(l.quantite) && l.quantite > 0);
  if (!valides.length) return { ok: false, message: "Le panier est vide." };
  if (!lieuId) return { ok: false, message: "Choisissez le cabinet de destination." };

  const supabase = await creerClientServeur();
  const { error } = await supabase.from("mouvements").insert(
    valides.map((l) => ({
      centre_id: profil.centre_id,
      produit_id: l.produitId,
      type: "sortie",
      quantite: l.quantite,
      lieu_id: lieuId,
    })),
  );
  if (error) return { ok: false, message: "La sortie n'a pas pu être enregistrée. Réessayez." };
  refresh();
  return { ok: true, message: "Sortie enregistrée." };
}
