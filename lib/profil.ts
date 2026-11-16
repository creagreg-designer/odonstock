// Lecture du profil de la personne connectée (nom, rôle, centre).
import { cache } from "react";
import { creerClientServeur } from "./supabase/server";

export type Profil = {
  id: string;
  nom: string | null;
  role: "admin" | "direction" | "responsable" | "poste";
  centre_id: string | null;
  centre_nom: string | null;
};

export const ROLES: Record<Profil["role"], string> = {
  admin: "Administrateur",
  direction: "Direction · lecture seule",
  responsable: "Responsable de stock",
  poste: "Poste du centre",
};

// Une relation Supabase peut revenir comme objet ou comme liste : on prend le nom dans les deux cas.
export function nomDe(relation: unknown): string | null {
  const r = Array.isArray(relation) ? relation[0] : relation;
  return r && typeof r === "object" && "nom" in r ? String((r as { nom: unknown }).nom) : null;
}

export const lireProfil = cache(async (): Promise<Profil | null> => {
  const supabase = await creerClientServeur();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profils")
    .select("id, nom, role, centre_id, centres(nom)")
    .eq("id", user.id)
    .single();
  if (!data) return null;

  return {
    id: data.id,
    nom: data.nom ?? user.email ?? null,
    role: data.role,
    centre_id: data.centre_id,
    centre_nom: nomDe(data.centres),
  };
});

export function voitTout(p: Profil | null) {
  return p?.role === "admin" || p?.role === "direction";
}

// Gestion (catalogue, seuils, parc) : administrateur et responsable de stock
export function peutGerer(p: Profil | null) {
  return p?.role === "admin" || p?.role === "responsable";
}

// Saisies du quotidien : tout le monde sauf la direction, en lecture seule
export function peutSaisir(p: Profil | null) {
  return !!p && p.role !== "direction";
}

// Prénom affiché : premier mot du nom saisi dans le profil.
// Tant que le nom n'est pas renseigné, on se rabat sur le début de l'adresse e-mail.
export function prenomDe(p: Profil | null) {
  const nom = (p?.nom ?? "").trim();
  if (!nom) return "";
  if (nom.includes("@")) {
    const debut = nom.split("@")[0].split(/[._-]/)[0];
    return debut.charAt(0).toUpperCase() + debut.slice(1);
  }
  return nom.split(/\s+/)[0];
}

// Valeur du stock, prix et montants : administrateur, responsable de stock et direction
export function voitValeurs(p: Profil | null) {
  return p?.role === "admin" || p?.role === "responsable" || p?.role === "direction";
}
