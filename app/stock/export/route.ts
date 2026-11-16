// Export de l'état du stock au format CSV (s'ouvre dans Excel)
import { creerClientServeur } from "@/lib/supabase/server";
import { lireProfil, voitValeurs } from "@/lib/profil";
import { formaterStock, jourParis } from "@/lib/format";
import { ETATS, lireEtatStock } from "@/lib/etat-stock";

function cellule(v: unknown) {
  const s = v == null ? "" : String(v);
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
  const profil = await lireProfil();
  if (!profil?.centre_id) return new Response("Accès refusé", { status: 403 });
  const supabase = await creerClientServeur();
  const lignes = await lireEtatStock(supabase, profil.centre_id);

  const valeurs = voitValeurs(profil);
  const entete = ["Produit", "Référence", "Catégorie", "En stock", "En stock (unités de sortie)", "Seuil (unités de sortie)", "État"];
  if (valeurs) entete.push("Prix d'achat", "Valeur (€)");
  const corps = lignes.map((l) =>
    [
      l.nom,
      l.reference,
      l.categorie,
      formaterStock(l.stock, l.parAchat, l.uniteAchat, l.uniteSortie),
      l.stock,
      l.seuil,
      ETATS[l.etat].label,
      ...(valeurs ? [l.prix == null ? "" : String(l.prix).replace(".", ","), l.valeur.toFixed(2).replace(".", ",")] : []),
    ]
      .map(cellule)
      .join(";"),
  );
  const csv = "﻿" + [entete.join(";"), ...corps].join("\r\n");
  const centre = (profil.centre_nom ?? "centre").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, "-");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="etat-du-stock-${centre}-${jourParis(new Date())}.csv"`,
    },
  });
}
