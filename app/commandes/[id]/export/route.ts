// Liste de la commande au format CSV, à reporter sur Dentira
import { creerClientServeur } from "@/lib/supabase/server";
import { lireProfil, nomDe, voitValeurs } from "@/lib/profil";
import { jourParis } from "@/lib/format";

function cellule(v: unknown) {
  const s = v == null ? "" : String(v);
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(_requete: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profil = await lireProfil();
  if (!profil) return new Response("Accès refusé", { status: 403 });
  const supabase = await creerClientServeur();
  const { data } = await supabase
    .from("commande_lignes")
    .select("quantite_commandee, prix_unitaire, ponctuel, note, produits(nom, reference, unite_achat, fournisseurs(nom))")
    .eq("commande_id", id);
  if (!data) return new Response("Commande introuvable", { status: 404 });

  const valeurs = voitValeurs(profil);
  const entete = ["Fournisseur", "Référence", "Produit", "Quantité", "Unité", "Ponctuel", "Note"];
  if (valeurs) entete.push("Prix unitaire", "Montant");
  const lignes = data
    .map((l) => {
      const p = (Array.isArray(l.produits) ? l.produits[0] : l.produits) as { nom: string; reference: string | null; unite_achat: string; fournisseurs: unknown };
      const prix = l.prix_unitaire == null ? null : Number(l.prix_unitaire);
      return [
        nomDe(p?.fournisseurs) ?? "",
        p?.reference,
        p?.nom,
        l.quantite_commandee,
        p?.unite_achat,
        l.ponctuel ? "oui" : "",
        l.note,
        ...(valeurs ? [prix == null ? "" : String(prix).replace(".", ","), prix == null ? "" : (prix * l.quantite_commandee).toFixed(2).replace(".", ",")] : []),
      ];
    })
    .sort((a, b) => String(a[0]).localeCompare(String(b[0]), "fr") || String(a[2]).localeCompare(String(b[2]), "fr"));
  const csv = "﻿" + [entete.join(";"), ...lignes.map((l) => l.map(cellule).join(";"))].join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="commande-${jourParis(new Date())}.csv"`,
    },
  });
}
