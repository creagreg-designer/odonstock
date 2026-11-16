// État de stock des rotatifs du centre, mis en page pour l'impression (A4)
import { Suspense } from "react";
import Logo from "@/components/logo";
import { creerClientServeur } from "@/lib/supabase/server";
import { lireProfil } from "@/lib/profil";
import { maintenantEnLettres } from "@/lib/format";
import { LISTE_STATUTS, STATUTS, type Statut } from "@/lib/rotatifs";
import Imprimer from "./imprimer";

export const metadata = { title: "État des rotatifs · OdonStock" };

async function Etat() {
  const profil = await lireProfil();
  if (!profil?.centre_id) return <p>Votre compte n&apos;est rattaché à aucun centre.</p>;
  const supabase = await creerClientServeur();
  const [{ data: types }, { data: parc }, { data: objectifs }] = await Promise.all([
    supabase.from("rotatif_types").select("id, nom").order("ordre"),
    supabase.from("rotatifs").select("type_id, numero_serie, marque, modele, statut").eq("centre_id", profil.centre_id),
    supabase.from("rotatif_objectifs").select("type_id, objectif").eq("centre_id", profil.centre_id),
  ]);
  const objectifPar = new Map((objectifs ?? []).map((o) => [o.type_id, o.objectif as number]));
  const rotatifs = parc ?? [];
  const groupes = (types ?? [])
    .map((t) => ({
      ...t,
      lignes: rotatifs
        .filter((r) => r.type_id === t.id)
        .sort((a, b) => a.numero_serie.localeCompare(b.numero_serie, "fr", { numeric: true })),
      objectif: objectifPar.get(t.id) ?? null,
    }))
    .filter((g) => g.lignes.length || g.objectif != null);
  const total = (s: Statut) => rotatifs.filter((r) => r.statut === s).length;

  return (
    <>
      <header className="flex items-start justify-between gap-6 border-b-2 border-odon-bleu pb-4">
        <div className="flex flex-col gap-2">
          <Logo taille={30} />
          <h1 className="font-titre text-2xl font-semibold text-odon-nuit">État du parc de rotatifs</h1>
          <p className="text-sm text-odon-gris-texte">
            {profil.centre_nom} · édité le {maintenantEnLettres()}
          </p>
        </div>
        <Imprimer />
      </header>

      <section className="mt-5">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-odon-bleu">Synthèse</h2>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-[#B8C2CC] text-left">
              <th className="py-1.5 pr-2 font-semibold">Type</th>
              <th className="px-2 py-1.5 text-right font-semibold">En circulation</th>
              <th className="px-2 py-1.5 text-right font-semibold">Objectif</th>
              <th className="px-2 py-1.5 text-right font-semibold">En panne</th>
              <th className="px-2 py-1.5 text-right font-semibold">En réparation</th>
              <th className="px-2 py-1.5 text-right font-semibold">Hors service</th>
              <th className="py-1.5 pl-2 text-right font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {groupes.map((g) => {
              const n = (s: Statut) => g.lignes.filter((r) => r.statut === s).length;
              const juste = g.objectif != null && n("circulation") < g.objectif;
              return (
                <tr key={g.id} className="border-b border-[#E3E7EB]">
                  <td className="py-1.5 pr-2">{g.nom}</td>
                  <td className={`px-2 py-1.5 text-right font-semibold ${juste ? "text-odon-alerte" : ""}`}>
                    {n("circulation")}{juste ? " ⚠" : ""}
                  </td>
                  <td className="px-2 py-1.5 text-right">{g.objectif ?? "—"}</td>
                  <td className="px-2 py-1.5 text-right">{n("panne")}</td>
                  <td className="px-2 py-1.5 text-right">{n("reparation")}</td>
                  <td className="px-2 py-1.5 text-right">{n("hors_service")}</td>
                  <td className="py-1.5 pl-2 text-right font-semibold">{g.lignes.length}</td>
                </tr>
              );
            })}
            <tr className="font-bold">
              <td className="py-1.5 pr-2">Total</td>
              <td className="px-2 py-1.5 text-right">{total("circulation")}</td>
              <td className="px-2 py-1.5 text-right" />
              <td className="px-2 py-1.5 text-right">{total("panne")}</td>
              <td className="px-2 py-1.5 text-right">{total("reparation")}</td>
              <td className="px-2 py-1.5 text-right">{total("hors_service")}</td>
              <td className="py-1.5 pl-2 text-right">{rotatifs.length}</td>
            </tr>
          </tbody>
        </table>
        <p className="mt-1 text-xs text-odon-gris-texte">⚠ : moins de rotatifs en circulation que l&apos;objectif.</p>
      </section>

      <section className="mt-6">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-odon-bleu">Détail par type</h2>
        {groupes.map((g) => (
          <div key={g.id} className="mb-4 break-inside-avoid">
            <h3 className="mb-1 text-[15px] font-semibold text-odon-nuit">
              {g.nom} <span className="font-normal text-odon-gris-texte">({g.lignes.length})</span>
            </h3>
            {g.lignes.length === 0 ? (
              <p className="text-xs text-odon-gris-texte">Aucun rotatif.</p>
            ) : (
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr className="border-b border-[#B8C2CC] text-left">
                    <th className="w-[30%] py-1 pr-2 font-semibold">N° de série</th>
                    <th className="w-[45%] px-2 py-1 font-semibold">Marque et modèle</th>
                    <th className="py-1 pl-2 font-semibold">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {g.lignes.map((r) => (
                    <tr key={r.numero_serie} className="border-b border-[#EEF1F4]">
                      <td className="py-1 pr-2 font-medium">{r.numero_serie}</td>
                      <td className="px-2 py-1">{[r.marque, r.modele].filter(Boolean).join(" · ") || "—"}</td>
                      <td className={`py-1 pl-2 ${r.statut === "circulation" ? "" : "font-semibold"}`}>
                        {STATUTS[r.statut as Statut]?.label ?? r.statut}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))}
      </section>

      <footer className="mt-6 border-t border-[#E3E7EB] pt-2 text-[11px] text-odon-gris-texte">
        OdonStock · {rotatifs.length} rotatifs · statuts possibles : {LISTE_STATUTS.map((s) => STATUTS[s].label).join(", ")}
      </footer>
    </>
  );
}

export default function PageImpression() {
  return (
    <main className="mx-auto min-h-screen max-w-[210mm] bg-white px-10 py-8 text-odon-encre print:max-w-none print:px-0 print:py-0">
      <Suspense fallback={<p className="text-odon-gris-texte">Préparation du document…</p>}>
        <Etat />
      </Suspense>
    </main>
  );
}
