import { Suspense } from "react";
import Link from "next/link";
import Coque, { classesBouton } from "@/components/coque";
import { creerClientServeur } from "@/lib/supabase/server";
import { lireProfil, nomDe, peutSaisir } from "@/lib/profil";
import { dateCourteParis, heureParis, joursDepuis } from "@/lib/format";

export const metadata = { title: "Inventaire · OdonStock" };

type Props = { searchParams: Promise<{ fait?: string }> };

async function Contenu({ searchParams }: Props) {
  const { fait } = await searchParams;
  const profil = await lireProfil();
  if (!profil?.centre_id) {
    return <p className="rounded-xl bg-[#FEF3C7] px-4 py-3 font-medium text-[#854D0E]">Votre compte n&apos;est rattaché à aucun centre.</p>;
  }
  const saisie = peutSaisir(profil);
  const supabase = await creerClientServeur();
  const [{ data: categories }, { data: produits }, { data: inventaires }] = await Promise.all([
    supabase.from("categories").select("id, nom").is("parent_id", null).order("ordre"),
    supabase.from("produits").select("categorie_id").eq("actif", true),
    supabase
      .from("inventaires")
      .select("id, categorie_id, cree_le, categories(nom), inventaire_lignes(ecart)")
      .eq("centre_id", profil.centre_id)
      .order("cree_le", { ascending: false })
      .limit(50),
  ]);

  const nbProduits = (id: string) => (produits ?? []).filter((p) => p.categorie_id === id).length;
  const dernier = (id: string | null) => (inventaires ?? []).find((i) => i.categorie_id === id || i.categorie_id === null);

  // Fiabilité sur 30 jours : part des produits comptés sans écart
  const recents = (inventaires ?? []).filter((i) => joursDepuis(i.cree_le) <= 30);
  const lignes = recents.flatMap((i) => (i.inventaire_lignes ?? []) as { ecart: number }[]);
  const sansEcart = lignes.filter((l) => l.ecart === 0).length;
  const fiabilite = lignes.length ? Math.round((sansEcart / lignes.length) * 100) : null;

  const [nbComptes, nbEcarts] = (fait ?? "").split("-").map(Number);

  return (
    <div className="flex flex-col gap-6">
      {fait && (
        <p role="status" className="rounded-xl bg-[#E3F4EA] px-4 py-3 text-sm font-semibold text-[#166534]">
          ✓ Inventaire enregistré : {nbComptes} produit{nbComptes > 1 ? "s" : ""} compté{nbComptes > 1 ? "s" : ""},{" "}
          {nbEcarts ? `${nbEcarts} écart${nbEcarts > 1 ? "s" : ""} corrigé${nbEcarts > 1 ? "s" : ""} dans le stock.` : "aucun écart."}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-odon-nuit to-odon-bleu p-6 text-white">
          <div>
            <p className="font-titre text-xl font-semibold">Inventaire complet</p>
            <p className="mt-1 text-sm text-[#BFDDF0]">Tout le stock d&apos;un coup : idéal pour l&apos;inventaire de départ.</p>
          </div>
          {saisie && (
            <Link href="/inventaire/compter?zone=tout" className="inline-flex h-11 items-center rounded-lg bg-[#00C8E8] px-5 text-sm font-semibold text-odon-nuit hover:bg-[#4FDCF2]">
              Commencer
            </Link>
          )}
        </section>
        <section className="rounded-2xl border border-[#E3E7EB] bg-white p-6">
          <p className="text-sm font-medium text-odon-gris-texte">Fiabilité des sorties (30 jours)</p>
          <p className="mt-1 font-titre text-4xl font-semibold text-odon-nuit">{fiabilite == null ? "—" : `${fiabilite} %`}</p>
          <p className="mt-1 text-xs text-odon-gris-texte">
            {fiabilite == null ? "Disponible après le premier inventaire." : `${sansEcart} produit(s) sans écart sur ${lignes.length} compté(s).`}
          </p>
        </section>
      </div>

      <section>
        <h2 className="mb-3 text-base font-semibold text-odon-encre">Inventaire tournant : une zone à la fois</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {(categories ?? []).map((c) => {
            const n = nbProduits(c.id);
            const d = dernier(c.id);
            const jours = d ? joursDepuis(d.cree_le) : null;
            const enRetard = jours == null || jours > 31;
            return (
              <div key={c.id} className="flex items-center justify-between gap-3 rounded-xl border border-[#E3E7EB] bg-white p-4">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate font-semibold text-odon-encre">{c.nom}</span>
                  <span className="text-xs text-odon-gris-texte">{n} produit{n > 1 ? "s" : ""}</span>
                  <span className={`text-xs font-medium ${enRetard ? "text-[#9A3412]" : "text-[#166534]"}`}>
                    {d ? `Compté le ${dateCourteParis(d.cree_le)}` : "Jamais compté"}
                  </span>
                </div>
                {saisie && <Link
                  href={`/inventaire/compter?zone=${c.id}`}
                  aria-disabled={n === 0}
                  className={`${classesBouton} shrink-0 ${n === 0 ? "pointer-events-none opacity-40" : ""}`}
                >
                  Compter
                </Link>}
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl border border-[#E3E7EB] bg-white">
        <h2 className="px-5 pt-5 text-base font-semibold text-odon-encre">Derniers inventaires</h2>
        {!inventaires?.length ? (
          <p className="px-6 py-10 text-center text-sm text-odon-gris-texte">Aucun inventaire pour l&apos;instant.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="text-left text-[13px] text-odon-gris-texte">
                  <th scope="col" className="px-5 py-3 font-medium">Date</th>
                  <th scope="col" className="px-3 py-3 font-medium">Zone</th>
                  <th scope="col" className="px-3 py-3 text-right font-medium">Produits comptés</th>
                  <th scope="col" className="px-5 py-3 text-right font-medium">Écarts</th>
                </tr>
              </thead>
              <tbody>
                {inventaires.slice(0, 15).map((i) => {
                  const l = (i.inventaire_lignes ?? []) as { ecart: number }[];
                  const ecarts = l.filter((x) => x.ecart !== 0).length;
                  return (
                    <tr key={i.id} className="border-t border-[#EEF1F4]">
                      <td className="px-5 py-3 text-[#33404B]">{dateCourteParis(i.cree_le)} · {heureParis(i.cree_le)}</td>
                      <td className="px-3 py-3 font-medium text-odon-encre">{nomDe(i.categories) ?? "Inventaire complet"}</td>
                      <td className="px-3 py-3 text-right">{l.length}</td>
                      <td className="px-5 py-3 text-right">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ecarts ? "bg-[#FDECE3] text-[#9A3412]" : "bg-[#E3F4EA] text-[#166534]"}`}>
                          {ecarts ? `${ecarts} écart${ecarts > 1 ? "s" : ""}` : "Aucun"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default function PageInventaire({ searchParams }: Props) {
  return (
    <Coque titre="Inventaire" sousTitre="Comptez le stock réel : les écarts corrigent automatiquement le stock">
      <Suspense fallback={<p className="text-odon-gris-texte">Chargement…</p>}>
        <Contenu searchParams={searchParams} />
      </Suspense>
    </Coque>
  );
}
