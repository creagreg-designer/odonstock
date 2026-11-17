// Export du parc de rotatifs au format CSV (s'ouvre directement dans Excel)
import { creerClientServeur } from "@/lib/supabase/server";
import { lireProfil, nomDe } from "@/lib/profil";
import { STATUTS, type Statut, comparerNumeros } from "@/lib/rotatifs";
import { jourParis } from "@/lib/format";

function cellule(v: unknown) {
  const s = v == null ? "" : String(v);
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
  const profil = await lireProfil();
  if (!profil?.centre_id) return new Response("Accès refusé", { status: 403 });

  const supabase = await creerClientServeur();
  const { data } = await supabase
    .from("rotatifs")
    .select("numero_serie, marque, modele, statut, cree_le, rotatif_types(nom, ordre)")
    .eq("centre_id", profil.centre_id);

  const lignes = (data ?? [])
    .map((r) => ({ ...r, type: nomDe(r.rotatif_types) ?? "" }))
    .sort((a, b) => a.type.localeCompare(b.type, "fr") || comparerNumeros(a.numero_serie, b.numero_serie));

  const entete = ["Type", "Numéro de série", "Marque", "Modèle", "Statut", "Ajouté le"];
  const corps = lignes.map((r) =>
    [r.type, r.numero_serie, r.marque, r.modele, STATUTS[r.statut as Statut]?.label ?? r.statut, jourParis(r.cree_le)]
      .map(cellule)
      .join(";"),
  );
  // Le point-virgule et l'en-tête UTF-8 permettent une ouverture correcte dans Excel en français
  const csv = "﻿" + [entete.join(";"), ...corps].join("\r\n");
  const nomFichier = `parc-rotatifs-${(profil.centre_nom ?? "centre").toLowerCase().replace(/\s+/g, "-")}-${jourParis(new Date())}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nomFichier.normalize("NFD").replace(/[̀-ͯ]/g, "")}"`,
    },
  });
}
