import { Suspense } from "react";
import Link from "next/link";
import Coque, { classesBouton, classesBoutonSecondaire } from "@/components/coque";
import SelectFleche from "@/components/select-fleche";
import { creerClientServeur } from "@/lib/supabase/server";
import { lireProfil, peutGerer, voitValeurs } from "@/lib/profil";
import { formaterPrix, formaterStock, maintenantEnLettres } from "@/lib/format";
import { ETATS, lireEtatStock, type Etat } from "@/lib/etat-stock";
import BoutonImprimer from "./bouton-imprimer";
import Seuil from "./seuil";

export const metadata = { title: "État du stock · OdonStock" };

type Filtres = { q?: string; categorie?: string; etat?: string };
type Props = { searchParams: Promise<Filtres> };

function normaliser(t: string) {
  return t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

async function Contenu({ searchParams }: Props) {
  const f = await searchParams;
  const profil = await lireProfil();
  if (!profil?.centre_id) {
    return <p className="rounded-xl bg-[#FEF3C7] px-4 py-3 font-medium text-[#854D0E]">Votre compte n&apos;est rattaché à aucun centre.</p>;
  }
  const supabase = await creerClientServeur();
  const [toutes, { data: categories }] = await Promise.all([
    lireEtatStock(supabase, profil.centre_id),
    supabase.from("categories").select("id, nom").is("parent_id", null).order("ordre"),
  ]);
  const modifiable = peutGerer(profil);
  const valeurs = voitValeurs(profil);

  const terme = normaliser(f.q ?? "").trim();
  const lignes = toutes
    .filter((l) => !f.categorie || l.categorieId === f.categorie)
    .filter((l) => !f.etat || l.etat === f.etat)
    .filter((l) => !terme || normaliser(l.nom).includes(terme) || normaliser(l.reference ?? "").includes(terme))
    .sort((a, b) => {
      const ordre = { rupture: 0, faible: 1, ok: 2 } as const;
      return ordre[a.etat] - ordre[b.etat] || a.nom.localeCompare(b.nom, "fr");
    });

  const compte = (e: Etat) => toutes.filter((l) => l.etat === e).length;
  const valeurTotale = toutes.reduce((n, l) => n + l.valeur, 0);
  const sansSeuil = toutes.filter((l) => l.seuil == null).length;

  const indicateurs = [
    valeurs
      ? { label: "Valeur du stock", valeur: formaterPrix(valeurTotale), note: `${toutes.length} produits suivis`, couleur: "text-odon-nuit", lien: "" }
      : { label: "Produits suivis", valeur: String(toutes.length), note: "dans le stock principal", couleur: "text-odon-nuit", lien: "" },
    { label: "Ruptures", valeur: String(compte("rupture")), note: "à commander en urgence", couleur: compte("rupture") ? "text-odon-alerte" : "text-odon-nuit", lien: "rupture" },
    { label: "Sous le seuil", valeur: String(compte("faible")), note: "à prévoir dans la commande", couleur: compte("faible") ? "text-[#A16207]" : "text-odon-nuit", lien: "faible" },
    { label: "Sans seuil d'alerte", valeur: String(sansSeuil), note: "cliquez sur « Non défini » pour le régler", couleur: "text-odon-nuit", lien: "" },
  ];
  const champ = "h-11 rounded-lg border border-[#D5DBE0] bg-white px-3 text-sm text-odon-encre";

  return (
    <div className="flex flex-col gap-6">
      <p className="hidden text-sm text-odon-gris-texte print:block">
        {profil.centre_nom} · état du stock édité le {maintenantEnLettres()}
      </p>

      <section aria-label="Synthèse" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {indicateurs.map((c) => {
          const contenu = (
            <>
              <p className="text-sm font-medium text-odon-gris-texte">{c.label}</p>
              <p className={`mt-1 font-titre text-3xl font-semibold ${c.couleur}`}>{c.valeur}</p>
              <p className="mt-0.5 text-xs text-odon-gris-texte">{c.note}</p>
            </>
          );
          return c.lien ? (
            <Link key={c.label} href={`/stock?etat=${c.lien}`} className="rounded-2xl border border-[#E3E7EB] bg-white p-5 transition hover:border-odon-turquoise">{contenu}</Link>
          ) : (
            <div key={c.label} className="rounded-2xl border border-[#E3E7EB] bg-white p-5">{contenu}</div>
          );
        })}
      </section>

      <section className="rounded-xl border border-[#E3E7EB] bg-white">
        <form action="/stock" className="impression-masquee flex flex-wrap items-end gap-3 border-b border-[#EEF1F4] p-4">
          <label className="flex flex-col gap-1 text-xs font-semibold text-odon-gris-texte">
            Produit
            <input type="search" name="q" defaultValue={f.q} placeholder="Nom ou référence…" className={`${champ} w-56`} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-odon-gris-texte">
            Catégorie
            <SelectFleche name="categorie" defaultValue={f.categorie ?? ""} className={champ} largeur="min-w-52">
              <option value="">Toutes</option>
              {(categories ?? []).map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </SelectFleche>
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-odon-gris-texte">
            État
            <SelectFleche name="etat" defaultValue={f.etat ?? ""} className={champ} largeur="min-w-44">
              <option value="">Tous</option>
              {(Object.keys(ETATS) as Etat[]).map((e) => <option key={e} value={e}>{ETATS[e].label}</option>)}
            </SelectFleche>
          </label>
          <button type="submit" className={classesBouton}>Filtrer</button>
          {(f.q || f.categorie || f.etat) && <Link href="/stock" className={classesBoutonSecondaire}>Effacer</Link>}
        </form>

        {lignes.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-odon-gris-texte">
            {toutes.length ? "Aucun produit ne correspond à ces filtres." : "Le catalogue est vide pour l'instant."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="text-left text-[13px] text-odon-gris-texte">
                  <th scope="col" className="px-5 py-3 font-medium">Produit</th>
                  <th scope="col" className="px-3 py-3 font-medium">Catégorie</th>
                  <th scope="col" className="px-3 py-3 font-medium">En stock</th>
                  <th scope="col" className="px-3 py-3 font-medium">Seuil d&apos;alerte</th>
                  <th scope="col" className="px-3 py-3 font-medium">État</th>
                  {valeurs && <th scope="col" className="px-5 py-3 text-right font-medium">Valeur</th>}
                </tr>
              </thead>
              <tbody>
                {lignes.map((l) => (
                  <tr key={l.id} className={`border-t border-[#EEF1F4] ${l.etat === "rupture" ? "bg-[#FFF7F3]" : ""}`}>
                    <td className="px-5 py-3">
                      <span className="flex flex-col gap-0.5">
                        <span className="font-medium text-odon-encre">{l.nom}</span>
                        <span className="text-xs text-odon-gris-texte">{l.reference ? `Réf. ${l.reference}` : "Sans référence"}</span>
                      </span>
                    </td>
                    <td className="px-3 py-3 text-[#33404B]">{l.categorie ?? "—"}</td>
                    <td className="px-3 py-3 font-semibold text-odon-encre">{formaterStock(l.stock, l.parAchat, l.uniteAchat, l.uniteSortie)}</td>
                    <td className="px-3 py-3">
                      <Seuil produitId={l.id} seuil={l.seuil} parAchat={l.parAchat} uniteAchat={l.uniteAchat} modifiable={modifiable} />
                    </td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ETATS[l.etat].classes}`}>{ETATS[l.etat].label}</span>
                    </td>
                    {valeurs && <td className="px-5 py-3 text-right font-semibold">{l.prix == null ? "—" : formaterPrix(l.valeur)}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="border-t border-[#EEF1F4] px-5 py-3 text-xs text-odon-gris-texte">
              {lignes.length} produit{lignes.length > 1 ? "s" : ""} affiché{lignes.length > 1 ? "s" : ""}
              {valeurs ? ` · valeur affichée : ${formaterPrix(lignes.reduce((n, l) => n + l.valeur, 0))}` : ""}. Les ruptures apparaissent en premier.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

export default function PageStock({ searchParams }: Props) {
  return (
    <Coque
      titre="État du stock"
      sousTitre="Ce qu'il reste dans le stock principal, produit par produit"
      actions={
        <>
          <a href="/stock/export" className={classesBoutonSecondaire}>Exporter en Excel</a>
          <BoutonImprimer className={classesBoutonSecondaire} />
        </>
      }
    >
      <Suspense fallback={<p className="text-odon-gris-texte">Chargement…</p>}>
        <Contenu searchParams={searchParams} />
      </Suspense>
    </Coque>
  );
}
