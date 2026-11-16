"use server";

import { refresh } from "next/cache";
import { creerClientServeur } from "@/lib/supabase/server";
import { lireProfil } from "@/lib/profil";

export type Resultat = { ok: boolean; message: string };

async function contexte() {
  const profil = await lireProfil();
  if (!profil?.centre_id) return null;
  return { supabase: await creerClientServeur(), centreId: profil.centre_id };
}

// Ce que l'assistante a encore en main, par taille
async function enCours(personneId: string) {
  const ctx = await contexte();
  if (!ctx) return new Map<string, number>();
  const { data } = await ctx.supabase
    .from("scan_posts_en_cours")
    .select("taille_id, quantite")
    .eq("personne_id", personneId);
  return new Map((data ?? []).map((l) => [l.taille_id as string, l.quantite as number]));
}

export async function enregistrerEmprunt(
  personneId: string,
  lignes: { tailleId: string; quantite: number }[],
): Promise<Resultat> {
  const ctx = await contexte();
  if (!ctx) return { ok: false, message: "Votre compte n'est rattaché à aucun centre." };
  const valides = lignes.filter((l) => Number.isInteger(l.quantite) && l.quantite > 0);
  if (!valides.length) return { ok: false, message: "Choisissez au moins une taille." };

  // Vérifie qu'il en reste assez pour chaque taille
  const [{ data: tailles }, { data: sorties }] = await Promise.all([
    ctx.supabase.from("scan_post_tailles").select("id, nom, quantite_totale").in("id", valides.map((l) => l.tailleId)),
    ctx.supabase.from("scan_posts_en_cours").select("taille_id, quantite").in("taille_id", valides.map((l) => l.tailleId)),
  ]);
  for (const l of valides) {
    const t = tailles?.find((x) => x.id === l.tailleId);
    const dehors = (sorties ?? []).filter((s) => s.taille_id === l.tailleId).reduce((n, s) => n + (s.quantite as number), 0);
    const dispo = (t?.quantite_totale ?? 0) - dehors;
    if (l.quantite > dispo) {
      return { ok: false, message: `Il ne reste que ${Math.max(dispo, 0)} ${t?.nom ?? "scan post"} disponible${dispo > 1 ? "s" : ""}.` };
    }
  }

  const lot = crypto.randomUUID();
  const { error } = await ctx.supabase.from("scan_post_mouvements").insert(
    valides.map((l) => ({
      centre_id: ctx.centreId,
      lot_id: lot,
      personne_id: personneId,
      taille_id: l.tailleId,
      type: "emprunt",
      quantite: l.quantite,
    })),
  );
  if (error) return { ok: false, message: "L'emprunt n'a pas pu être enregistré. Réessayez." };
  refresh();
  return { ok: true, message: "Emprunt enregistré." };
}

export async function toutRendre(personneId: string): Promise<Resultat> {
  const ctx = await contexte();
  if (!ctx) return { ok: false, message: "Votre compte n'est rattaché à aucun centre." };
  const enMain = await enCours(personneId);
  if (!enMain.size) return { ok: false, message: "Rien à rendre." };

  const lot = crypto.randomUUID();
  const { error } = await ctx.supabase.from("scan_post_mouvements").insert(
    [...enMain].map(([tailleId, quantite]) => ({
      centre_id: ctx.centreId,
      lot_id: lot,
      personne_id: personneId,
      taille_id: tailleId,
      type: "retour",
      quantite,
    })),
  );
  if (error) return { ok: false, message: "Le retour n'a pas pu être enregistré. Réessayez." };
  refresh();
  return { ok: true, message: "Retour enregistré." };
}

// Retour partiel ou perte, sur une ou plusieurs tailles à la fois
export async function enregistrerPartiel(
  type: "retour" | "perte",
  personneId: string,
  lignes: { tailleId: string; quantite: number }[],
): Promise<Resultat> {
  const ctx = await contexte();
  if (!ctx) return { ok: false, message: "Votre compte n'est rattaché à aucun centre." };
  const valides = lignes.filter((l) => Number.isInteger(l.quantite) && l.quantite > 0);
  if (!valides.length) return { ok: false, message: "Indiquez au moins un scan post." };

  const enMain = await enCours(personneId);
  if (valides.some((l) => l.quantite > (enMain.get(l.tailleId) ?? 0))) {
    return { ok: false, message: "La quantité dépasse ce que l'assistante a emprunté." };
  }

  const lot = crypto.randomUUID();
  const { error } = await ctx.supabase.from("scan_post_mouvements").insert(
    valides.map((l) => ({
      centre_id: ctx.centreId,
      lot_id: lot,
      personne_id: personneId,
      taille_id: l.tailleId,
      type,
      quantite: l.quantite,
    })),
  );
  if (error) return { ok: false, message: "L'opération n'a pas pu être enregistrée. Réessayez." };
  refresh();
  return { ok: true, message: type === "retour" ? "Retour enregistré." : "Perte enregistrée." };
}

// Suppression d'un mouvement (emprunt, retour ou perte) : réservée à l'administrateur
export async function supprimerMouvement(lotId: string, type: string): Promise<Resultat> {
  const profil = await lireProfil();
  if (profil?.role !== "admin" || !profil.centre_id) {
    return { ok: false, message: "Seul l'administrateur peut supprimer un mouvement." };
  }
  const supabase = await creerClientServeur();
  const { data, error } = await supabase
    .from("scan_post_mouvements")
    .delete()
    .eq("centre_id", profil.centre_id)
    .eq("lot_id", lotId)
    .eq("type", type)
    .select("id");
  if (error || !data?.length) {
    return { ok: false, message: "Le mouvement n'a pas pu être supprimé." };
  }
  refresh();
  return { ok: true, message: "Mouvement supprimé." };
}
