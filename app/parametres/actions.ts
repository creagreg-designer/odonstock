"use server";

import { refresh } from "next/cache";
import { creerClientServeur } from "@/lib/supabase/server";
import { lireProfil, peutGerer } from "@/lib/profil";

export type Resultat = { ok: boolean; message: string };

const REFUS: Resultat = { ok: false, message: "Votre rôle ne permet pas de modifier ce réglage." };
const ECHEC: Resultat = { ok: false, message: "La modification n'a pas pu être enregistrée." };
const OK: Resultat = { ok: true, message: "Enregistré." };

async function gestionCentre() {
  const profil = await lireProfil();
  if (!profil?.centre_id || !peutGerer(profil)) return null;
  return { supabase: await creerClientServeur(), centreId: profil.centre_id };
}

async function gestionAdmin() {
  const profil = await lireProfil();
  if (profil?.role !== "admin") return null;
  return { supabase: await creerClientServeur(), centreId: profil.centre_id };
}

const doublon = (code?: string) => (code === "23505" ? { ok: false, message: "Ce nom existe déjà." } : ECHEC);

// Échange la position d'un élément avec son voisin (listes triées par « ordre »)
async function deplacer(table: "lieux" | "categories" | "scan_post_tailles", id: string, sens: -1 | 1, filtre?: { colonne: string; valeur: string }) {
  const supabase = await creerClientServeur();
  let requete = supabase.from(table).select("id, ordre").order("ordre").order("nom");
  if (filtre) requete = requete.eq(filtre.colonne, filtre.valeur);
  if (table === "categories") requete = requete.is("parent_id", null);
  const { data } = await requete;
  const liste = (data ?? []).map((l, i) => ({ id: l.id as string, ordre: i + 1 }));
  const i = liste.findIndex((l) => l.id === id);
  const j = i + sens;
  if (i < 0 || j < 0 || j >= liste.length) return OK;
  [liste[i].ordre, liste[j].ordre] = [liste[j].ordre, liste[i].ordre];
  for (const l of liste) {
    const { error } = await supabase.from(table).update({ ordre: l.ordre }).eq("id", l.id);
    if (error) return ECHEC;
  }
  refresh();
  return OK;
}

// ---- Cabinets et lieux de sortie ----
export async function ajouterLieu(nom: string): Promise<Resultat> {
  const ctx = await gestionCentre();
  if (!ctx) return REFUS;
  if (!nom.trim()) return { ok: false, message: "Indiquez un nom." };
  const { count } = await ctx.supabase.from("lieux").select("*", { count: "exact", head: true }).eq("centre_id", ctx.centreId);
  const { error } = await ctx.supabase.from("lieux").insert({ centre_id: ctx.centreId, nom: nom.trim(), ordre: (count ?? 0) + 1 });
  if (error) return doublon(error.code);
  refresh();
  return OK;
}
export async function renommerLieu(id: string, nom: string): Promise<Resultat> {
  const ctx = await gestionCentre();
  if (!ctx) return REFUS;
  if (!nom.trim()) return { ok: false, message: "Indiquez un nom." };
  const { error } = await ctx.supabase.from("lieux").update({ nom: nom.trim() }).eq("id", id);
  if (error) return doublon(error.code);
  refresh();
  return OK;
}
export async function basculerLieu(id: string, actif: boolean): Promise<Resultat> {
  const ctx = await gestionCentre();
  if (!ctx) return REFUS;
  const { error } = await ctx.supabase.from("lieux").update({ actif }).eq("id", id);
  if (error) return ECHEC;
  refresh();
  return OK;
}
export async function deplacerLieu(id: string, sens: -1 | 1): Promise<Resultat> {
  const ctx = await gestionCentre();
  if (!ctx) return REFUS;
  return deplacer("lieux", id, sens, { colonne: "centre_id", valeur: ctx.centreId });
}

// ---- Assistantes (emprunts de scan posts) ----
export async function ajouterPersonne(prenom: string): Promise<Resultat> {
  const ctx = await gestionCentre();
  if (!ctx) return REFUS;
  if (!prenom.trim()) return { ok: false, message: "Indiquez un prénom." };
  const { error } = await ctx.supabase.from("personnes").insert({ centre_id: ctx.centreId, prenom: prenom.trim() });
  if (error) return ECHEC;
  refresh();
  return OK;
}
export async function renommerPersonne(id: string, prenom: string): Promise<Resultat> {
  const ctx = await gestionCentre();
  if (!ctx) return REFUS;
  if (!prenom.trim()) return { ok: false, message: "Indiquez un prénom." };
  const { error } = await ctx.supabase.from("personnes").update({ prenom: prenom.trim() }).eq("id", id);
  if (error) return ECHEC;
  refresh();
  return OK;
}
export async function basculerPersonne(id: string, actif: boolean): Promise<Resultat> {
  const ctx = await gestionCentre();
  if (!ctx) return REFUS;
  const { error } = await ctx.supabase.from("personnes").update({ actif }).eq("id", id);
  if (error) return ECHEC;
  refresh();
  return OK;
}

// ---- Tailles de scan posts ----
export async function ajouterTaille(nom: string): Promise<Resultat> {
  const ctx = await gestionCentre();
  if (!ctx) return REFUS;
  if (!nom.trim()) return { ok: false, message: "Indiquez un nom de taille." };
  const { count } = await ctx.supabase.from("scan_post_tailles").select("*", { count: "exact", head: true }).eq("centre_id", ctx.centreId);
  const { error } = await ctx.supabase.from("scan_post_tailles").insert({ centre_id: ctx.centreId, nom: nom.trim(), quantite_totale: 0, ordre: (count ?? 0) + 1 });
  if (error) return doublon(error.code);
  refresh();
  return OK;
}
export async function renommerTaille(id: string, nom: string): Promise<Resultat> {
  const ctx = await gestionCentre();
  if (!ctx) return REFUS;
  if (!nom.trim()) return { ok: false, message: "Indiquez un nom de taille." };
  const { error } = await ctx.supabase.from("scan_post_tailles").update({ nom: nom.trim() }).eq("id", id);
  if (error) return doublon(error.code);
  refresh();
  return OK;
}
export async function quantiteTaille(id: string, quantite: number): Promise<Resultat> {
  const ctx = await gestionCentre();
  if (!ctx) return REFUS;
  if (!Number.isInteger(quantite) || quantite < 0) return { ok: false, message: "Quantité incorrecte." };
  const { error } = await ctx.supabase.from("scan_post_tailles").update({ quantite_totale: quantite }).eq("id", id);
  if (error) return ECHEC;
  refresh();
  return OK;
}
export async function deplacerTaille(id: string, sens: -1 | 1): Promise<Resultat> {
  const ctx = await gestionCentre();
  if (!ctx) return REFUS;
  return deplacer("scan_post_tailles", id, sens, { colonne: "centre_id", valeur: ctx.centreId });
}

// ---- Catégories (communes au groupe : administrateur) ----
export async function ajouterCategorie(nom: string): Promise<Resultat> {
  const ctx = await gestionAdmin();
  if (!ctx) return REFUS;
  if (!nom.trim()) return { ok: false, message: "Indiquez un nom." };
  const { count } = await ctx.supabase.from("categories").select("*", { count: "exact", head: true }).is("parent_id", null);
  const { error } = await ctx.supabase.from("categories").insert({ nom: nom.trim(), ordre: (count ?? 0) + 1 });
  if (error) return doublon(error.code);
  refresh();
  return OK;
}
export async function renommerCategorie(id: string, nom: string): Promise<Resultat> {
  const ctx = await gestionAdmin();
  if (!ctx) return REFUS;
  if (!nom.trim()) return { ok: false, message: "Indiquez un nom." };
  const { error } = await ctx.supabase.from("categories").update({ nom: nom.trim() }).eq("id", id);
  if (error) return doublon(error.code);
  refresh();
  return OK;
}
export async function deplacerCategorie(id: string, sens: -1 | 1): Promise<Resultat> {
  const ctx = await gestionAdmin();
  if (!ctx) return REFUS;
  return deplacer("categories", id, sens);
}

// ---- Utilisateurs (administrateur) ----
export async function majUtilisateur(
  id: string,
  donnees: { nom: string; role: string; centreId: string | null },
): Promise<Resultat> {
  const ctx = await gestionAdmin();
  if (!ctx) return REFUS;
  if (!["admin", "direction", "responsable", "poste"].includes(donnees.role)) return { ok: false, message: "Rôle inconnu." };
  const moi = await lireProfil();
  if (moi?.id === id && donnees.role !== "admin") {
    return { ok: false, message: "Vous ne pouvez pas retirer votre propre rôle d'administrateur." };
  }
  const { error } = await ctx.supabase
    .from("profils")
    .update({ nom: donnees.nom.trim() || null, role: donnees.role, centre_id: donnees.centreId || null })
    .eq("id", id);
  if (error) return ECHEC;
  refresh();
  return OK;
}
