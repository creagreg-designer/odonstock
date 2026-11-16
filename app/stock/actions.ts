"use server";

import { refresh } from "next/cache";
import { creerClientServeur } from "@/lib/supabase/server";
import { lireProfil, peutGerer } from "@/lib/profil";

// Seuil d'alerte manuel, saisi en unités d'achat et enregistré en unités de sortie
export async function definirSeuil(produitId: string, seuilAchats: number | null, parAchat: number) {
  const profil = await lireProfil();
  if (!profil?.centre_id || !peutGerer(profil)) return { ok: false, message: "Votre rôle ne permet pas de modifier les seuils." };
  if (seuilAchats != null && (!Number.isInteger(seuilAchats) || seuilAchats < 0)) return { ok: false, message: "Seuil incorrect." };
  const supabase = await creerClientServeur();
  const { error } = await supabase.from("stocks").upsert(
    {
      centre_id: profil.centre_id,
      produit_id: produitId,
      seuil_manuel: seuilAchats == null ? null : seuilAchats * Math.max(1, parAchat),
      seuil_automatique: false,
    },
    { onConflict: "centre_id,produit_id" },
  );
  if (error) return { ok: false, message: "Le seuil n'a pas pu être enregistré." };
  refresh();
  return { ok: true, message: "Seuil enregistré." };
}
