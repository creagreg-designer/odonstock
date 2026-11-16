"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { creerClientServeur } from "@/lib/supabase/server";
import { lireProfil, peutGerer } from "@/lib/profil";
import type { TypeCommande } from "@/lib/commandes";

export type Resultat = { ok: boolean; message: string };

export type LigneValidee = {
  produitId: string;
  quantite: number; // unités d'achat
  quantiteProposee: number | null;
  prix: number | null;
  ponctuel: boolean;
  note: string;
};

export async function validerCommande(type: TypeCommande, lignes: LigneValidee[]): Promise<Resultat> {
  const profil = await lireProfil();
  if (!profil?.centre_id || !peutGerer(profil)) return { ok: false, message: "Votre rôle ne permet pas de valider une commande." };
  const valides = lignes.filter((l) => Number.isInteger(l.quantite) && l.quantite > 0);
  if (!valides.length) return { ok: false, message: "La commande est vide." };

  const supabase = await creerClientServeur();
  const { data: commande, error } = await supabase
    .from("commandes")
    .insert({ centre_id: profil.centre_id, type, statut: "validee", validee_le: new Date().toISOString() })
    .select("id")
    .single();
  if (error || !commande) return { ok: false, message: "La commande n'a pas pu être enregistrée." };

  const { error: erreurLignes } = await supabase.from("commande_lignes").insert(
    valides.map((l) => ({
      commande_id: commande.id,
      produit_id: l.produitId,
      quantite_proposee: l.quantiteProposee,
      quantite_commandee: l.quantite,
      prix_unitaire: l.prix,
      ponctuel: l.ponctuel,
      note: l.note.trim() || null,
    })),
  );
  if (erreurLignes) {
    await supabase.from("commandes").delete().eq("id", commande.id);
    return { ok: false, message: "Les lignes de la commande n'ont pas pu être enregistrées." };
  }
  redirect(`/commandes/${commande.id}?validee=1`);
}

export async function annulerCommande(id: string): Promise<Resultat> {
  const profil = await lireProfil();
  if (!profil?.centre_id || !peutGerer(profil)) return { ok: false, message: "Votre rôle ne permet pas d'annuler une commande." };
  const supabase = await creerClientServeur();
  const { error } = await supabase.from("commandes").update({ statut: "annulee" }).eq("id", id).eq("statut", "validee");
  if (error) return { ok: false, message: "La commande n'a pas pu être annulée." };
  refresh();
  return { ok: true, message: "Commande annulée." };
}
