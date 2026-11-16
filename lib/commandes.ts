// Calcul des propositions de commande à partir de la consommation réelle
import type { SupabaseClient } from "@supabase/supabase-js";
import { nomDe } from "./profil";

export type TypeCommande = "mensuelle" | "reassort" | "urgence";

export const TYPES_COMMANDE: Record<TypeCommande, { label: string; semaines: number; texte: string }> = {
  mensuelle: { label: "Commande du mois", semaines: 6, texte: "À passer entre le 15 et le 20 · couvre jusqu'à la commande suivante, délai de livraison et marge compris." },
  reassort: { label: "Réassort", semaines: 3, texte: "À passer entre le 1er et le 5 · uniquement ce qui risque de manquer avant la prochaine commande du mois." },
  urgence: { label: "Urgences", semaines: 2, texte: "Produits en rupture ou sous leur seuil, à commander sans attendre." },
};

export const STATUTS_COMMANDE: Record<string, { label: string; classes: string }> = {
  proposee: { label: "Proposée", classes: "bg-[#E6E8EB] text-[#33404B]" },
  validee: { label: "Validée · en attente", classes: "bg-[#E6F7FB] text-odon-bleu" },
  recue_partielle: { label: "Reçue en partie", classes: "bg-[#FEF3C7] text-[#854D0E]" },
  recue: { label: "Reçue", classes: "bg-[#E3F4EA] text-[#166534]" },
  annulee: { label: "Annulée", classes: "bg-[#FDECE3] text-[#9A3412]" },
};

export type Proposition = {
  produitId: string;
  nom: string;
  reference: string | null;
  fournisseur: string;
  uniteAchat: string;
  uniteSortie: string;
  parAchat: number;
  prix: number | null;
  stock: number;
  consoHebdo: number; // en unités de sortie
  enCommande: number; // en unités de sortie, déjà commandé et pas encore reçu
  quantite: number; // proposée, en unités d'achat
  pourquoi: string;
};

const JOURS_HISTORIQUE = 56; // 8 semaines de sorties

export function depuisJours(jours: number) {
  return new Date(Date.now() - jours * 86_400_000).toISOString();
}

export async function calculerPropositions(
  supabase: SupabaseClient,
  centreId: string,
  type: TypeCommande,
): Promise<Proposition[]> {
  const [{ data: produits }, { data: stocks }, { data: sorties }, { data: enCours }] = await Promise.all([
    supabase
      .from("produits")
      .select("id, nom, reference, unite_achat, unite_sortie, sorties_par_achat, prix_achat, fournisseurs(nom)")
      .eq("actif", true),
    supabase.from("stocks").select("produit_id, quantite, seuil_manuel, seuil_auto, seuil_automatique").eq("centre_id", centreId),
    supabase.from("mouvements").select("produit_id, quantite").eq("centre_id", centreId).eq("type", "sortie").gte("cree_le", depuisJours(JOURS_HISTORIQUE)),
    supabase
      .from("commande_lignes")
      .select("produit_id, quantite_commandee, quantite_recue, commandes!inner(centre_id, statut)")
      .eq("commandes.centre_id", centreId)
      .in("commandes.statut", ["validee", "recue_partielle"]),
  ]);

  const stockPar = new Map((stocks ?? []).map((s) => [s.produit_id as string, s]));
  const sortiPar = new Map<string, number>();
  for (const s of sorties ?? []) sortiPar.set(s.produit_id, (sortiPar.get(s.produit_id) ?? 0) + s.quantite);
  const commandePar = new Map<string, number>();
  for (const l of enCours ?? []) {
    commandePar.set(l.produit_id, (commandePar.get(l.produit_id) ?? 0) + Math.max(0, l.quantite_commandee - l.quantite_recue));
  }

  const semaines = TYPES_COMMANDE[type].semaines;
  const resultat: Proposition[] = [];

  for (const p of produits ?? []) {
    const s = stockPar.get(p.id);
    const stock = (s?.quantite as number) ?? 0;
    const seuil = (s ? (s.seuil_automatique ? s.seuil_auto : s.seuil_manuel) : null) as number | null;
    const consoHebdo = (sortiPar.get(p.id) ?? 0) / (JOURS_HISTORIQUE / 7);
    const enCommande = (commandePar.get(p.id) ?? 0) * p.sorties_par_achat;
    const disponible = stock + enCommande;

    const rupture = stock <= 0 && (consoHebdo > 0 || seuil != null);
    const sousSeuil = seuil != null && stock <= seuil;
    const besoinConso = Math.ceil(consoHebdo * semaines);

    // Réassort et urgences : seulement ce qui risque vraiment de manquer
    if (type === "urgence" && !rupture && !sousSeuil) continue;
    if (type === "reassort" && !sousSeuil && !(consoHebdo > 0 && disponible < besoinConso)) continue;

    const cible = Math.max(besoinConso, seuil != null ? seuil * 2 : 0);
    const besoin = cible - disponible;
    if (besoin <= 0) continue;

    const raisons: string[] = [];
    if (rupture) raisons.push("Rupture");
    else if (sousSeuil) raisons.push("Sous le seuil");
    if (consoHebdo > 0) raisons.push(`conso. ${consoHebdo < 10 ? consoHebdo.toFixed(1).replace(".", ",") : Math.round(consoHebdo)} ${p.unite_sortie}/sem.`);
    else if (seuil != null) raisons.push("calculé sur le seuil (pas encore d'historique)");
    if (enCommande > 0) raisons.push("une partie est déjà commandée");

    resultat.push({
      produitId: p.id,
      nom: p.nom,
      reference: p.reference,
      fournisseur: nomDe(p.fournisseurs) ?? "Sans fournisseur",
      uniteAchat: p.unite_achat,
      uniteSortie: p.unite_sortie,
      parAchat: p.sorties_par_achat,
      prix: p.prix_achat == null ? null : Number(p.prix_achat),
      stock,
      consoHebdo,
      enCommande,
      quantite: Math.max(1, Math.ceil(besoin / p.sorties_par_achat)),
      pourquoi: raisons.join(" · "),
    });
  }
  return resultat.sort((a, b) => a.fournisseur.localeCompare(b.fournisseur, "fr") || a.nom.localeCompare(b.nom, "fr"));
}
