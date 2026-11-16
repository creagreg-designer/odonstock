import Link from "next/link";
import { creerClientServeur } from "@/lib/supabase/server";
import { lireProfil, nomDe, voitValeurs } from "@/lib/profil";
import { formaterPrix, formaterStock, pluriel } from "@/lib/format";

type Props = { searchParams: Promise<{ q?: string; categorie?: string; ajoute?: string }> };

export default async function ListeProduits({ searchParams }: Props) {
  const { q = "", categorie = "", ajoute } = await searchParams;
  const recherche = q.replace(/[,()%*\\]/g, " ").trim();

  const supabase = await creerClientServeur();
  const profil = await lireProfil();

  let requete = supabase
    .from("produits")
    .select("id, reference, nom, unite_achat, unite_sortie, sorties_par_achat, contenu_sortie, unite_contenu, prix_achat, centre_id, categories(nom), fournisseurs(nom)")
    .eq("actif", true)
    .order("nom");
  if (categorie) requete = requete.eq("categorie_id", categorie);
  if (recherche) requete = requete.or(`nom.ilike.%${recherche}%,reference.ilike.%${recherche}%`);

  const [{ data: categories }, { data: produits, error }, { data: stocks }] = await Promise.all([
    supabase.from("categories").select("id, nom").is("parent_id", null).order("ordre"),
    requete,
    profil?.centre_id
      ? supabase.from("stocks").select("produit_id, quantite").eq("centre_id", profil.centre_id)
      : Promise.resolve({ data: [] as { produit_id: string; quantite: number }[] }),
  ]);

  const valeurs = voitValeurs(profil);
  const stockPar = new Map((stocks ?? []).map((s) => [s.produit_id, s.quantite]));
  const lien = (cat: string) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (cat) p.set("categorie", cat);
    const s = p.toString();
    return s ? `/catalogue?${s}` : "/catalogue";
  };
  const puce = (actif: boolean) =>
    `inline-flex h-9 shrink-0 items-center rounded-full border px-4 text-sm font-medium transition ${
      actif ? "border-odon-bleu bg-odon-bleu text-white" : "border-[#D5DBE0] bg-white text-[#33404B] hover:bg-[#E6F7FB]"
    }`;

  return (
    <div className="flex flex-col gap-5">
      {ajoute && (
        <p role="status" className="rounded-xl bg-[#E3F4EA] px-4 py-3 text-sm font-semibold text-[#166534]">
          ✓ « {ajoute} » a été ajouté au catalogue.
        </p>
      )}

      <form action="/catalogue" className="flex flex-wrap items-center gap-3">
        {categorie && <input type="hidden" name="categorie" value={categorie} />}
        <label className="flex h-11 w-full max-w-sm items-center gap-2 rounded-lg border border-[#D5DBE0] bg-white px-3 focus-within:border-odon-turquoise">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5B6772" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
          <span className="sr-only">Rechercher un produit</span>
          <input type="search" name="q" defaultValue={q} placeholder="Nom ou référence…" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
        </label>
        <button type="submit" className="h-11 rounded-lg border border-[#D5DBE0] bg-white px-4 text-sm font-semibold text-odon-bleu hover:bg-[#E6F7FB]">
          Rechercher
        </button>
      </form>

      <nav aria-label="Filtrer par catégorie" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        <Link href={lien("")} className={puce(!categorie)} aria-current={!categorie ? "page" : undefined}>Toutes</Link>
        {(categories ?? []).map((c) => (
          <Link key={c.id} href={lien(c.id)} className={puce(categorie === c.id)} aria-current={categorie === c.id ? "page" : undefined}>
            {c.nom}
          </Link>
        ))}
      </nav>

      <section className="rounded-xl border border-[#E3E7EB] bg-white">
        {error ? (
          <p className="p-6 text-sm text-[#9A3412]">Le catalogue n&apos;a pas pu être chargé. Réessayez dans un instant.</p>
        ) : !produits?.length ? (
          <div className="px-6 py-12 text-center">
            <p className="font-semibold text-odon-encre">{q || categorie ? "Aucun produit ne correspond." : "Le catalogue est vide pour l'instant."}</p>
            <p className="mt-1 text-sm text-odon-gris-texte">
              {q || categorie ? "Essayez une autre recherche ou une autre catégorie." : "Ajoutez votre premier produit avec le bouton en haut à droite."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="text-left text-[13px] text-odon-gris-texte">
                  <th scope="col" className="px-5 py-3 font-medium">Produit</th>
                  <th scope="col" className="px-3 py-3 font-medium">Catégorie</th>
                  <th scope="col" className="px-3 py-3 font-medium">Fournisseur</th>
                  <th scope="col" className="px-3 py-3 font-medium">Sortie à</th>
                  <th scope="col" className="px-3 py-3 font-medium">Stock</th>
                  {valeurs && <th scope="col" className="px-5 py-3 text-right font-medium">Prix d&apos;achat</th>}
                </tr>
              </thead>
              <tbody>
                {produits.map((p) => (
                  <tr key={p.id} className="border-t border-[#EEF1F4]">
                    <td className="px-5 py-3">
                      <span className="flex flex-col gap-0.5">
                        <span className="font-medium text-odon-encre">{p.nom}</span>
                        <span className="text-xs text-odon-gris-texte">
                          {p.reference ? `Réf. ${p.reference}` : "Sans référence"}
                          {p.centre_id ? " · référence du centre" : ""}
                        </span>
                      </span>
                    </td>
                    <td className="px-3 py-3 text-[#33404B]">{nomDe(p.categories) ?? "—"}</td>
                    <td className="px-3 py-3 text-[#33404B]">{nomDe(p.fournisseurs) ?? "—"}</td>
                    <td className="px-3 py-3 text-[#33404B]">
                      {`1 ${p.unite_sortie}`}
                      {p.contenu_sortie && p.unite_contenu ? ` de ${p.contenu_sortie} ${pluriel(p.unite_contenu, p.contenu_sortie)}` : ""}
                      {p.sorties_par_achat > 1 && (
                        <span className="block text-xs text-odon-gris-texte">{p.sorties_par_achat} par {p.unite_achat}</span>
                      )}
                    </td>
                    <td className="px-3 py-3 font-semibold text-odon-encre">
                      {formaterStock(stockPar.get(p.id) ?? 0, p.sorties_par_achat, p.unite_achat, p.unite_sortie)}
                    </td>
                    {valeurs && (
                    <td className="px-5 py-3 text-right font-semibold">
                        {formaterPrix(p.prix_achat)}
                        <span className="block text-xs font-normal text-odon-gris-texte">par {p.unite_achat}</span>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="border-t border-[#EEF1F4] px-5 py-3 text-xs text-odon-gris-texte">
              {produits.length} produit{produits.length > 1 ? "s" : ""}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
