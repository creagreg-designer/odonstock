import Link from "next/link";
import { creerClientServeur } from "@/lib/supabase/server";
import { lireProfil, peutGerer } from "@/lib/profil";
import { classesBouton, classesBoutonSecondaire } from "@/components/coque";
import { creerProduit } from "../actions";
import BlocUnites from "./bloc-unites";

const ERREURS: Record<string, string> = {
  droits: "Votre rôle ne permet pas d'ajouter des produits.",
  obligatoire: "Le nom et la catégorie sont obligatoires.",
  unites: "Le nombre d'unités de sortie par unité d'achat doit être un nombre entier, au moins 1.",
  prix: "Le prix d'achat n'est pas valide.",
  centre: "Votre compte n'est rattaché à aucun centre.",
  fournisseur: "Ce fournisseur n'existe pas encore et votre rôle ne permet pas de le créer.",
  reference: "Un produit avec cette référence existe déjà.",
  enregistrement: "Le produit n'a pas pu être enregistré. Réessayez.",
};


const champ =
  "h-11 w-full rounded-lg border border-[#D5DBE0] bg-white px-3 text-sm text-odon-encre outline-none focus:border-odon-turquoise focus:ring-2 focus:ring-odon-turquoise/30";
const etiquette = "flex flex-col gap-1.5 text-sm font-semibold text-odon-encre";
const aide = "text-xs font-normal text-odon-gris-texte";

export default async function Formulaire({ searchParams }: { searchParams: Promise<{ erreur?: string }> }) {
  const { erreur } = await searchParams;
  const profil = await lireProfil();
  const supabase = await creerClientServeur();
  const [{ data: categories }, { data: fournisseurs }] = await Promise.all([
    supabase.from("categories").select("id, nom").is("parent_id", null).order("ordre"),
    supabase.from("fournisseurs").select("nom").eq("actif", true).order("nom"),
  ]);

  if (!peutGerer(profil)) {
    return <p className="rounded-xl bg-[#FEF3C7] px-4 py-3 font-medium text-[#854D0E]">{ERREURS.droits}</p>;
  }

  return (
    <form action={creerProduit} className="flex max-w-3xl flex-col gap-6">
      {erreur && ERREURS[erreur] && (
        <p role="alert" className="rounded-xl bg-[#FDECE3] px-4 py-3 text-sm font-semibold text-[#9A3412]">
          {ERREURS[erreur]}
        </p>
      )}

      <section className="flex flex-col gap-5 rounded-xl border border-[#E3E7EB] bg-white p-6">
        <h2 className="text-base font-semibold text-odon-encre">Le produit</h2>
        <label className={etiquette}>
          Nom du produit *
          <input name="nom" required className={champ} placeholder="Ex. Anesthésique articaïne 4 %" />
        </label>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className={etiquette}>
            Catégorie *
            <select name="categorie" required defaultValue="" className={champ}>
              <option value="" disabled>Choisir…</option>
              {(categories ?? []).map((c) => (
                <option key={c.id} value={c.id}>{c.nom}</option>
              ))}
            </select>
          </label>
          <label className={etiquette}>
            Référence
            <input name="reference" className={champ} placeholder="Référence fournisseur ou Dentira" />
          </label>
          <label className={etiquette}>
            Fournisseur
            <input name="fournisseur" list="liste-fournisseurs" className={champ} placeholder="Choisir ou saisir un nom" />
            <datalist id="liste-fournisseurs">
              {(fournisseurs ?? []).map((f) => <option key={f.nom} value={f.nom} />)}
            </datalist>
          </label>
          <label className={etiquette}>
            Prix d&apos;achat (€)
            <input name="prix_achat" inputMode="decimal" className={champ} placeholder="Ex. 44,50" />
            <span className={aide}>Prix d&apos;une unité d&apos;achat, par exemple d&apos;une boîte</span>
          </label>
        </div>
      </section>

      <section className="flex flex-col gap-5 rounded-xl border border-[#E3E7EB] bg-white p-6">
        <div>
          <h2 className="text-base font-semibold text-odon-encre">Unités</h2>
          <p className={`${aide} mt-1`}>
            Exemple : on achète une <strong>boîte</strong> d&apos;anesthésique, mais on sort une <strong>plaquette</strong> ; il y a 5 plaquettes par boîte.
          </p>
        </div>
        <BlocUnites champ={champ} etiquette={etiquette} aide={aide} />
      </section>

      {profil?.role === "admin" && (
        <section className="flex flex-col gap-4 rounded-xl border border-[#E3E7EB] bg-white p-6">
          <h2 id="titre-portee" className="text-base font-semibold text-odon-encre">Disponible pour</h2>
          <div role="radiogroup" aria-labelledby="titre-portee" className="flex flex-col gap-3">
            <label className="flex items-center gap-3 text-sm text-odon-encre">
              <input type="radio" name="portee" value="commun" defaultChecked className="h-4 w-4 accent-odon-bleu" />
              Tous les centres du groupe (catalogue commun)
            </label>
            <label className="flex items-center gap-3 text-sm text-odon-encre">
              <input type="radio" name="portee" value="centre" className="h-4 w-4 accent-odon-bleu" />
              Uniquement {profil?.centre_nom ?? "mon centre"}
            </label>
          </div>
        </section>
      )}

      <div className="flex flex-wrap gap-3">
        <button type="submit" className={classesBouton}>Ajouter au catalogue</button>
        <Link href="/catalogue" className={classesBoutonSecondaire}>Annuler</Link>
      </div>
    </form>
  );
}
