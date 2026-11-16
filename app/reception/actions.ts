"use server";

import { refresh } from "next/cache";
import { creerClientServeur } from "@/lib/supabase/server";
import { lireProfil } from "@/lib/profil";

export type Resultat = { ok: boolean; message: string };

// Entrée en stock : quantités converties en unités de sortie côté navigateur
export async function enregistrerReception(
  lignes: { produitId: string; quantite: number; achats: number }[],
  note: string,
  commandeId: string | null = null,
): Promise<Resultat> {
  const profil = await lireProfil();
  if (!profil?.centre_id) return { ok: false, message: "Votre compte n'est rattaché à aucun centre." };
  const valides = lignes.filter((l) => Number.isInteger(l.quantite) && l.quantite > 0);
  if (!valides.length) return { ok: false, message: "Indiquez au moins une quantité reçue." };

  const supabase = await creerClientServeur();
  const { error } = await supabase.from("mouvements").insert(
    valides.map((l) => ({
      centre_id: profil.centre_id,
      produit_id: l.produitId,
      type: "entree",
      quantite: l.quantite,
      commande_id: commandeId,
      note: note.trim() || null,
    })),
  );
  if (error) return { ok: false, message: "La réception n'a pas pu être enregistrée. Réessayez." };

  // Pointage de la commande : quantités reçues (en unités d'achat) et statut
  if (commandeId) {
    const { data: lignesCommande } = await supabase
      .from("commande_lignes")
      .select("id, produit_id, quantite_commandee, quantite_recue")
      .eq("commande_id", commandeId);
    const recuPar = new Map<string, number>();
    for (const l of valides) recuPar.set(l.produitId, (recuPar.get(l.produitId) ?? 0) + l.achats);
    for (const lc of lignesCommande ?? []) {
      const recu = recuPar.get(lc.produit_id);
      if (!recu) continue;
      await supabase.from("commande_lignes").update({ quantite_recue: lc.quantite_recue + recu }).eq("id", lc.id);
      lc.quantite_recue += recu;
      recuPar.delete(lc.produit_id);
    }
    const complete = (lignesCommande ?? []).every((lc) => lc.quantite_recue >= lc.quantite_commandee);
    await supabase.from("commandes").update({ statut: complete ? "recue" : "recue_partielle" }).eq("id", commandeId);
  }
  refresh();
  return { ok: true, message: "Réception enregistrée." };
}
