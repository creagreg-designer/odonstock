import { Suspense } from "react";
import Link from "next/link";
import Coque from "@/components/coque";
import { Barres, Colonnes } from "@/components/graphiques";
import { creerClientServeur } from "@/lib/supabase/server";
import { lireProfil, nomDe, voitValeurs } from "@/lib/profil";
import { formaterPrix, formaterStock, jourParis, libelleMois, moisDePeriode, pluriel } from "@/lib/format";
import { lireEtatStock } from "@/lib/etat-stock";
import { depuisJours } from "@/lib/commandes";

export const metadata = { title: "Analytique · OdonStock" };

type Props = { searchParams: Promise<{ mois?: string }> };

type Produit = { id: string; nom: string; prix_achat: number | null; sorties_par_achat: number; unite_sortie: string; categories: unknown };
type Mouvement = { produit_id: string; type: string; quantite: number; cree_le: string; lieux: unknown; produits: unknown };

async function Contenu({ searchParams }: Props) {
  const { mois: demande } = await searchParams;
  const nbMois = [3, 6, 12].includes(Number(demande)) ? Number(demande) : 6;
  const profil = await lireProfil();
  if (!profil?.centre_id) {
    return <p className="rounded-xl bg-[#FEF3C7] px-4 py-3 font-medium text-[#854D0E]">Votre compte n&apos;est rattaché à aucun centre.</p>;
  }
  const valeurs = voitValeurs(profil);
  const centreId = profil.centre_id;
  const mois = moisDePeriode(nbMois);
  const debut = `${mois[0]}-01T00:00:00+01:00`;
  const supabase = await creerClientServeur();

  const [{ data: mouvements }, etat, { data: sorties90 }, { data: inventaires }, { data: pertes }, { data: reparations }] = await Promise.all([
    supabase
      .from("mouvements")
      .select("produit_id, type, quantite, cree_le, lieux(nom), produits(id, nom, prix_achat, sorties_par_achat, unite_sortie, categories(nom))")
      .eq("centre_id", centreId)
      .in("type", ["sortie", "entree"])
      .gte("cree_le", debut)
      .limit(20000),
    lireEtatStock(supabase, centreId),
    supabase.from("mouvements").select("produit_id").eq("centre_id", centreId).eq("type", "sortie").gte("cree_le", depuisJours(90)),
    supabase.from("inventaires").select("cree_le, inventaire_lignes(ecart)").eq("centre_id", centreId).gte("cree_le", depuisJours(30)),
    supabase.from("scan_post_mouvements").select("quantite").eq("centre_id", centreId).eq("type", "perte").gte("cree_le", debut),
    supabase.from("reparations").select("cout, envoye_le, rotatifs!inner(centre_id)").eq("rotatifs.centre_id", centreId).gte("envoye_le", mois[0] + "-01"),
  ]);

  const mvts = (mouvements ?? []) as Mouvement[];
  const produitDe = (m: Mouvement) => (Array.isArray(m.produits) ? m.produits[0] : m.produits) as Produit | undefined;
  // Mesure : la valeur en euros si l'utilisateur voit les montants, sinon le nombre d'unités
  const mesure = (m: Mouvement) => {
    const p = produitDe(m);
    if (!valeurs) return m.quantite;
    return p?.prix_achat == null ? 0 : (m.quantite / p.sorties_par_achat) * Number(p.prix_achat);
  };
  const texte = (v: number) => (valeurs ? formaterPrix(v) : `${Math.round(v)} unité${Math.round(v) > 1 ? "s" : ""}`);

  const sorties = mvts.filter((m) => m.type === "sortie");
  const entrees = mvts.filter((m) => m.type === "entree");
  const somme = (liste: Mouvement[]) => liste.reduce((n, m) => n + mesure(m), 0);

  // Consommation mois par mois
  const parMois = new Map(mois.map((m) => [m, 0]));
  for (const m of sorties) {
    const cle = jourParis(m.cree_le).slice(0, 7);
    if (parMois.has(cle)) parMois.set(cle, parMois.get(cle)! + mesure(m));
  }
  const pointsMois = mois.map((m) => ({ cle: m, libelle: libelleMois(m), valeur: parMois.get(m) ?? 0, texte: texte(parMois.get(m) ?? 0) }));
  const moisComplets = pointsMois.slice(0, -1).filter((p) => p.valeur > 0);
  const moyenne = moisComplets.length ? moisComplets.reduce((n, p) => n + p.valeur, 0) / moisComplets.length : 0;

  // Regroupements
  const regrouper = (cleDe: (m: Mouvement) => string) => {
    const m = new Map<string, number>();
    for (const s of sorties) m.set(cleDe(s), (m.get(cleDe(s)) ?? 0) + mesure(s));
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([cle, v]) => ({ cle, libelle: cle, valeur: v, texte: texte(v) }));
  };
  const parCategorie = regrouper((m) => nomDe(produitDe(m)?.categories) ?? "Sans catégorie");
  const parLieu = regrouper((m) => nomDe(m.lieux) ?? "Sans lieu");

  // Top 10 des produits
  const top = new Map<string, { nom: string; unite: string; quantite: number; valeur: number }>();
  for (const s of sorties) {
    const p = produitDe(s);
    if (!p) continue;
    const t = top.get(p.id) ?? { nom: p.nom, unite: p.unite_sortie, quantite: 0, valeur: 0 };
    t.quantite += s.quantite;
    t.valeur += p.prix_achat == null ? 0 : (s.quantite / p.sorties_par_achat) * Number(p.prix_achat);
    top.set(p.id, t);
  }
  const top10 = [...top.values()].sort((a, b) => (valeurs ? b.valeur - a.valeur : b.quantite - a.quantite)).slice(0, 10);

  // Produits dormants : en stock, sans aucune sortie depuis 90 jours
  const actifs = new Set((sorties90 ?? []).map((s) => s.produit_id as string));
  const dormants = etat.filter((l) => l.stock > 0 && !actifs.has(l.id)).sort((a, b) => b.valeur - a.valeur);
  const valeurDormante = dormants.reduce((n, l) => n + l.valeur, 0);

  // Fiabilité des sorties (inventaires des 30 derniers jours)
  const lignesInv = (inventaires ?? []).flatMap((i) => (i.inventaire_lignes ?? []) as { ecart: number }[]);
  const fiabilite = lignesInv.length ? Math.round((lignesInv.filter((l) => l.ecart === 0).length / lignesInv.length) * 100) : null;

  const ruptures = etat.filter((l) => l.etat === "rupture").length;
  const nbPertes = (pertes ?? []).reduce((n, p) => n + p.quantite, 0);
  const coutReparations = (reparations ?? []).reduce((n, r) => n + (Number(r.cout) || 0), 0);

  const indicateurs = [
    { label: valeurs ? "Consommation moyenne / mois" : "Unités sorties / mois", valeur: moyenne ? texte(moyenne) : "—", note: moisComplets.length ? `sur ${moisComplets.length} mois complet${moisComplets.length > 1 ? "s" : ""}` : "pas encore de mois complet" },
    { label: valeurs ? "Réceptions sur la période" : "Unités reçues", valeur: texte(somme(entrees)), note: `${entrees.length} ligne${entrees.length > 1 ? "s" : ""} de réception` },
    { label: "Ruptures en ce moment", valeur: String(ruptures), note: "produits à zéro", alerte: ruptures > 0 },
    { label: "Fiabilité des sorties", valeur: fiabilite == null ? "—" : `${fiabilite} %`, note: "mesurée aux inventaires (30 jours)" },
  ];

  const carte = "rounded-2xl border border-[#E3E7EB] bg-white p-5";

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Période" className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-sm font-semibold text-odon-gris-texte">Période :</span>
        {[3, 6, 12].map((n) => (
          <Link
            key={n}
            href={`/analytique?mois=${n}`}
            aria-current={n === nbMois ? "page" : undefined}
            className={`inline-flex h-9 items-center rounded-full border px-4 text-sm font-medium ${n === nbMois ? "border-odon-bleu bg-odon-bleu text-white" : "border-[#D5DBE0] bg-white text-[#33404B] hover:bg-[#E6F7FB]"}`}
          >
            {n} mois
          </Link>
        ))}
        {!valeurs && <span className="ml-2 text-xs text-odon-gris-texte">Les montants sont réservés à l&apos;administrateur, au responsable de stock et à la direction : les volumes sont affichés en unités.</span>}
      </nav>

      <section aria-label="Indicateurs" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {indicateurs.map((c) => (
          <div key={c.label} className={carte}>
            <p className="text-sm font-medium text-odon-gris-texte">{c.label}</p>
            <p className={`mt-1 font-titre text-3xl font-semibold ${c.alerte ? "text-odon-alerte" : "text-odon-nuit"}`}>{c.valeur}</p>
            <p className="mt-0.5 text-xs text-odon-gris-texte">{c.note}</p>
          </div>
        ))}
      </section>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section className={carte}>
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-base font-semibold text-odon-encre">{valeurs ? "Consommation mois par mois (€)" : "Unités sorties mois par mois"}</h2>
            <span className="text-xs text-odon-gris-texte">mois en cours en plus clair · survolez une barre</span>
          </div>
          <Colonnes points={pointsMois} titre="Consommation mois par mois" />
        </section>
        <section className={carte}>
          <h2 className="mb-4 text-base font-semibold text-odon-encre">Par catégorie</h2>
          <Barres points={parCategorie} vide="Aucune sortie sur la période." />
        </section>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-2">
        <section className={carte}>
          <h2 className="mb-3 text-base font-semibold text-odon-encre">Top 10 des produits</h2>
          {!top10.length ? (
            <p className="py-6 text-center text-sm text-odon-gris-texte">Aucune sortie sur la période.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[13px] text-odon-gris-texte">
                  <th scope="col" className="py-2 font-medium">Produit</th>
                  <th scope="col" className="py-2 text-right font-medium">Sorties</th>
                  {valeurs && <th scope="col" className="py-2 text-right font-medium">Coût</th>}
                </tr>
              </thead>
              <tbody>
                {top10.map((t, i) => (
                  <tr key={t.nom} className="border-t border-[#EEF1F4]">
                    <td className="py-2.5 pr-3"><span className="mr-2 text-xs font-semibold text-odon-gris-texte">{i + 1}</span><span className="font-medium text-odon-encre">{t.nom}</span></td>
                    <td className="py-2.5 text-right text-[#33404B]">{t.quantite} {pluriel(t.unite, t.quantite)}</td>
                    {valeurs && <td className="py-2.5 text-right font-semibold">{formaterPrix(t.valeur)}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
        <section className={carte}>
          <h2 className="mb-4 text-base font-semibold text-odon-encre">Par cabinet et lieu de sortie</h2>
          <Barres points={parLieu} vide="Aucune sortie sur la période." />
        </section>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section className={carte}>
          <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-base font-semibold text-odon-encre">Produits dormants</h2>
            {valeurs && dormants.length > 0 && <span className="text-sm font-semibold text-odon-alerte">{formaterPrix(valeurDormante)} immobilisés</span>}
          </div>
          <p className="mb-3 text-xs text-odon-gris-texte">En stock, mais aucune sortie depuis 90 jours : à ne pas recommander, voire à écouler.</p>
          {!dormants.length ? (
            <p className="py-4 text-center text-sm text-odon-gris-texte">Aucun produit dormant.</p>
          ) : (
            <ul>
              {dormants.slice(0, 8).map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-3 border-t border-[#EEF1F4] py-2.5 first:border-t-0">
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium text-odon-encre">{d.nom}</span>
                    <span className="text-xs text-odon-gris-texte">{formaterStock(d.stock, d.parAchat, d.uniteAchat, d.uniteSortie)}</span>
                  </span>
                  {valeurs && <span className="text-sm font-semibold">{formaterPrix(d.valeur)}</span>}
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="flex flex-col gap-3">
          <div className={carte}>
            <p className="text-sm font-medium text-odon-gris-texte">Scan posts perdus sur la période</p>
            <p className={`mt-1 font-titre text-3xl font-semibold ${nbPertes ? "text-odon-alerte" : "text-odon-nuit"}`}>{nbPertes}</p>
            <Link href="/scan-posts/historique?type=perte" className="mt-1 inline-block text-xs font-semibold text-odon-bleu hover:underline">Voir le détail</Link>
          </div>
          {valeurs && (
            <div className={carte}>
              <p className="text-sm font-medium text-odon-gris-texte">Réparations de rotatifs sur la période</p>
              <p className="mt-1 font-titre text-3xl font-semibold text-odon-nuit">{formaterPrix(coutReparations)}</p>
              <p className="mt-0.5 text-xs text-odon-gris-texte">{(reparations ?? []).length} envoi{(reparations ?? []).length > 1 ? "s" : ""} en réparation · coûts saisis dans Rotatifs</p>
            </div>
          )}
          {valeurs && (
            <div className={carte}>
              <p className="text-sm font-medium text-odon-gris-texte">Valeur du stock aujourd&apos;hui</p>
              <p className="mt-1 font-titre text-3xl font-semibold text-odon-nuit">{formaterPrix(etat.reduce((n, l) => n + l.valeur, 0))}</p>
              <p className="mt-0.5 text-xs text-odon-gris-texte">{etat.length} produits suivis</p>
            </div>
          )}
        </section>
      </div>

      <p className="text-xs text-odon-gris-texte">
        Les montants sont calculés avec le prix d&apos;achat du catalogue. Le comparatif entre centres et la partie implantologie arriveront avec l&apos;ouverture des autres centres et du pôle implantologie.
      </p>
    </div>
  );
}

export default function PageAnalytique({ searchParams }: Props) {
  return (
    <Coque titre="Analytique" sousTitre="La consommation réelle du centre, pour piloter les achats">
      <Suspense fallback={<p className="text-odon-gris-texte">Calcul des indicateurs…</p>}>
        <Contenu searchParams={searchParams} />
      </Suspense>
    </Coque>
  );
}
