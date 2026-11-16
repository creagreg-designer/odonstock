"use server";

import { redirect } from "next/navigation";
import { creerClientServeur } from "@/lib/supabase/server";
import { lireProfil, peutGerer } from "@/lib/profil";

function texte(form: FormData, champ: string) {
  return String(form.get(champ) ?? "").trim();
}

export async function creerProduit(form: FormData) {
  const profil = await lireProfil();
  if (!peutGerer(profil)) redirect("/catalogue/nouveau?erreur=droits");

  const nom = texte(form, "nom");
  const reference = texte(form, "reference") || null;
  const categorieId = texte(form, "categorie");
  const fournisseurNom = texte(form, "fournisseur");
  const uniteAchat = texte(form, "unite_achat").toLowerCase() || "boîte";
  const uniteSortie = texte(form, "unite_sortie").toLowerCase() || uniteAchat;
  const sortiesParAchat = Number.parseInt(texte(form, "sorties_par_achat") || "1", 10);
  const prixTexte = texte(form, "prix_achat").replace(",", ".");
  const prix = prixTexte ? Number(prixTexte) : null;
  const commun = form.get("portee") === "commun" && profil?.role === "admin";
  const contenu = Number.parseInt(texte(form, "contenu_sortie"), 10);
  const uniteContenu = texte(form, "unite_contenu").toLowerCase();
  const avecContenu = Number.isInteger(contenu) && contenu >= 1 && uniteContenu !== "";

  if (!nom || !categorieId) redirect("/catalogue/nouveau?erreur=obligatoire");
  if (!Number.isInteger(sortiesParAchat) || sortiesParAchat < 1) redirect("/catalogue/nouveau?erreur=unites");
  if (prix !== null && (!Number.isFinite(prix) || prix < 0)) redirect("/catalogue/nouveau?erreur=prix");
  if (!commun && !profil?.centre_id) redirect("/catalogue/nouveau?erreur=centre");

  const supabase = await creerClientServeur();

  // Fournisseur : on reprend celui qui existe déjà, sinon on le crée.
  let fournisseurId: string | null = null;
  if (fournisseurNom) {
    const { data: existant } = await supabase
      .from("fournisseurs")
      .select("id")
      .ilike("nom", fournisseurNom)
      .maybeSingle();
    if (existant) {
      fournisseurId = existant.id;
    } else {
      const { data: cree, error } = await supabase
        .from("fournisseurs")
        .insert({ nom: fournisseurNom })
        .select("id")
        .single();
      if (error || !cree) redirect("/catalogue/nouveau?erreur=fournisseur");
      fournisseurId = cree.id;
    }
  }

  const { error } = await supabase.from("produits").insert({
    nom,
    reference,
    categorie_id: categorieId,
    fournisseur_id: fournisseurId,
    unite_achat: uniteAchat,
    unite_sortie: uniteSortie,
    sorties_par_achat: uniteAchat === uniteSortie ? 1 : sortiesParAchat,
    prix_achat: prix,
    contenu_sortie: avecContenu ? contenu : null,
    unite_contenu: avecContenu ? uniteContenu : null,
    centre_id: commun ? null : profil!.centre_id,
  });

  if (error) {
    redirect(`/catalogue/nouveau?erreur=${error.code === "23505" ? "reference" : "enregistrement"}`);
  }
  redirect(`/catalogue?ajoute=${encodeURIComponent(nom)}`);
}
