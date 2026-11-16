"use server";

import { refresh } from "next/cache";
import { creerClientServeur } from "@/lib/supabase/server";
import { lireProfil, peutGerer } from "@/lib/profil";
import { LISTE_STATUTS, type Statut } from "@/lib/rotatifs";

export type Resultat = { ok: boolean; message: string };

async function contexte() {
  const profil = await lireProfil();
  if (!profil?.centre_id || !peutGerer(profil)) return null;
  return { supabase: await creerClientServeur(), centreId: profil.centre_id };
}

const REFUS = { ok: false, message: "Votre rôle ne permet pas de modifier le parc de rotatifs." };

export async function ajouterRotatif(donnees: {
  typeId: string;
  numeroSerie: string;
  marque: string;
  modele: string;
  statut: Statut;
}): Promise<Resultat> {
  const ctx = await contexte();
  if (!ctx) return REFUS;
  const numero = donnees.numeroSerie.trim();
  if (!donnees.typeId || !numero) return { ok: false, message: "Le type et le numéro de série sont obligatoires." };
  if (!LISTE_STATUTS.includes(donnees.statut)) return { ok: false, message: "Statut inconnu." };

  const { data, error } = await ctx.supabase
    .from("rotatifs")
    .insert({
      centre_id: ctx.centreId,
      type_id: donnees.typeId,
      numero_serie: numero,
      marque: donnees.marque.trim() || null,
      modele: donnees.modele.trim() || null,
      statut: donnees.statut,
    })
    .select("id")
    .single();

  if (error) {
    return {
      ok: false,
      message: error.code === "23505"
        ? "Un rotatif de ce type porte déjà ce numéro de série."
        : "Le rotatif n'a pas pu être enregistré. Réessayez.",
    };
  }
  if (donnees.statut === "reparation") {
    await ctx.supabase.from("reparations").insert({ rotatif_id: data.id });
  }
  refresh();
  return { ok: true, message: `Rotatif n° ${numero} ajouté.` };
}

export async function changerStatut(rotatifId: string, statut: Statut): Promise<Resultat> {
  const ctx = await contexte();
  if (!ctx) return REFUS;
  if (!LISTE_STATUTS.includes(statut)) return { ok: false, message: "Statut inconnu." };

  const { data: avant } = await ctx.supabase.from("rotatifs").select("statut").eq("id", rotatifId).single();
  if (!avant) return { ok: false, message: "Rotatif introuvable." };
  if (avant.statut === statut) return { ok: true, message: "" };

  const { error } = await ctx.supabase.from("rotatifs").update({ statut }).eq("id", rotatifId);
  if (error) return { ok: false, message: "Le statut n'a pas pu être modifié." };

  // Envoi en réparation : on ouvre une fiche ; retour de réparation : on la clôture
  if (statut === "reparation") {
    await ctx.supabase.from("reparations").insert({ rotatif_id: rotatifId });
  } else if (avant.statut === "reparation") {
    await ctx.supabase
      .from("reparations")
      .update({ retour_le: new Date().toISOString().slice(0, 10) })
      .eq("rotatif_id", rotatifId)
      .is("retour_le", null);
  }
  refresh();
  return { ok: true, message: "Statut mis à jour." };
}

export async function definirObjectif(typeId: string, objectif: number): Promise<Resultat> {
  const ctx = await contexte();
  if (!ctx) return REFUS;
  if (!Number.isInteger(objectif) || objectif < 0) return { ok: false, message: "Objectif incorrect." };
  const { error } = await ctx.supabase
    .from("rotatif_objectifs")
    .upsert({ centre_id: ctx.centreId, type_id: typeId, objectif });
  if (error) return { ok: false, message: "L'objectif n'a pas pu être enregistré." };
  refresh();
  return { ok: true, message: "Objectif enregistré." };
}

export async function majReparation(
  reparationId: string,
  donnees: { reparateur: string; cout: string },
): Promise<Resultat> {
  const ctx = await contexte();
  if (!ctx) return REFUS;
  const coutTexte = donnees.cout.replace(",", ".").trim();
  const cout = coutTexte ? Number(coutTexte) : null;
  if (cout !== null && (!Number.isFinite(cout) || cout < 0)) return { ok: false, message: "Coût incorrect." };
  const { error } = await ctx.supabase
    .from("reparations")
    .update({ reparateur: donnees.reparateur.trim() || null, cout })
    .eq("id", reparationId);
  if (error) return { ok: false, message: "La réparation n'a pas pu être mise à jour." };
  refresh();
  return { ok: true, message: "Réparation mise à jour." };
}

// Modification et suppression d'un rotatif : réservées à l'administrateur
async function contexteAdmin() {
  const profil = await lireProfil();
  if (profil?.role !== "admin" || !profil.centre_id) return null;
  return { supabase: await creerClientServeur(), centreId: profil.centre_id };
}

const REFUS_ADMIN = { ok: false, message: "Seul l'administrateur peut modifier ou supprimer un rotatif." };

export async function modifierRotatif(
  id: string,
  donnees: { typeId: string; numeroSerie: string; marque: string; modele: string },
): Promise<Resultat> {
  const ctx = await contexteAdmin();
  if (!ctx) return REFUS_ADMIN;
  const numero = donnees.numeroSerie.trim();
  if (!donnees.typeId || !numero) return { ok: false, message: "Le type et le numéro de série sont obligatoires." };
  const { error } = await ctx.supabase
    .from("rotatifs")
    .update({
      type_id: donnees.typeId,
      numero_serie: numero,
      marque: donnees.marque.trim() || null,
      modele: donnees.modele.trim() || null,
    })
    .eq("id", id)
    .eq("centre_id", ctx.centreId);
  if (error) {
    return {
      ok: false,
      message: error.code === "23505" ? "Un rotatif de ce type porte déjà ce numéro de série." : "La modification n'a pas pu être enregistrée.",
    };
  }
  refresh();
  return { ok: true, message: `Rotatif n° ${numero} modifié.` };
}

export async function supprimerRotatif(id: string): Promise<Resultat> {
  const ctx = await contexteAdmin();
  if (!ctx) return REFUS_ADMIN;
  const { data, error } = await ctx.supabase
    .from("rotatifs")
    .delete()
    .eq("id", id)
    .eq("centre_id", ctx.centreId)
    .select("id");
  if (error || !data?.length) return { ok: false, message: "Le rotatif n'a pas pu être supprimé." };
  refresh();
  return { ok: true, message: "Rotatif supprimé." };
}
