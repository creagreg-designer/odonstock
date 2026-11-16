import { Suspense } from "react";
import Link from "next/link";
import Coque, { classesBouton, classesBoutonSecondaire } from "@/components/coque";
import { creerClientServeur } from "@/lib/supabase/server";
import { lireProfil, nomDe, peutGerer, voitValeurs } from "@/lib/profil";
import { dateCourteParis, formaterPrix, pluriel } from "@/lib/format";
import { STATUTS_COMMANDE, TYPES_COMMANDE, type TypeCommande } from "@/lib/commandes";
import BoutonAnnuler from "./annuler";

export const metadata = { title: "Commande · OdonStock" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ validee?: string }> };

async function Detail({ params, searchParams }: Props) {
  const { id } = await params;
  const { validee } = await searchParams;
  const profil = await lireProfil();
  const supabase = await creerClientServeur();
  const { data: c } = await supabase
    .from("commandes")
    .select("id, type, statut, validee_le, cree_le, commande_lignes(id, quantite_commandee, quantite_recue, prix_unitaire, ponctuel, note, produits(nom, reference, unite_achat, fournisseurs(nom)))")
    .eq("id", id)
    .single();
  if (!c) return <p className="rounded-xl bg-white px-6 py-10 text-center text-odon-gris-texte">Commande introuvable.</p>;

  const valeurs = voitValeurs(profil);
  type L = { id: string; quantite_commandee: number; quantite_recue: number; prix_unitaire: number | null; ponctuel: boolean; note: string | null; produits: unknown };
  const lignes = ((c.commande_lignes ?? []) as L[]).map((l) => {
    const p = (Array.isArray(l.produits) ? l.produits[0] : l.produits) as { nom: string; reference: string | null; unite_achat: string; fournisseurs: unknown };
    return { ...l, nom: p?.nom ?? "?", reference: p?.reference, unite: p?.unite_achat ?? "unité", fournisseur: nomDe(p?.fournisseurs) ?? "Sans fournisseur" };
  }).sort((a, b) => a.fournisseur.localeCompare(b.fournisseur, "fr") || a.nom.localeCompare(b.nom, "fr"));
  const total = lignes.reduce((n, l) => n + (Number(l.prix_unitaire) || 0) * l.quantite_commandee, 0);
  const statut = STATUTS_COMMANDE[c.statut] ?? STATUTS_COMMANDE.proposee;
  const ouverte = c.statut === "validee" || c.statut === "recue_partielle";

  return (
    <div className="flex flex-col gap-5">
      {validee && (
        <p role="status" className="rounded-xl bg-[#E3F4EA] px-4 py-3 text-sm font-semibold text-[#166534]">
          ✓ Commande validée. Passez-la sur Dentira (l&apos;export vous donne la liste), puis réceptionnez-la à la livraison.
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E3E7EB] bg-white px-5 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-titre text-lg font-semibold text-odon-nuit">{TYPES_COMMANDE[c.type as TypeCommande]?.label ?? c.type}</span>
          <span className="text-sm text-odon-gris-texte">validée le {dateCourteParis(c.validee_le ?? c.cree_le)}</span>
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statut.classes}`}>{statut.label}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`/commandes/${c.id}/export`} className={classesBoutonSecondaire}>Exporter pour Dentira</a>
          {ouverte && <Link href={`/reception?commande=${c.id}`} className={classesBouton}>Réceptionner</Link>}
          {c.statut === "validee" && peutGerer(profil) && <BoutonAnnuler id={c.id} />}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#E3E7EB] bg-white">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="text-left text-[13px] text-odon-gris-texte">
              <th scope="col" className="px-5 py-3 font-medium">Produit</th>
              <th scope="col" className="px-3 py-3 font-medium">Fournisseur</th>
              <th scope="col" className="px-3 py-3 text-right font-medium">Commandé</th>
              <th scope="col" className="px-3 py-3 text-right font-medium">Reçu</th>
              {valeurs && <th scope="col" className="px-5 py-3 text-right font-medium">Montant</th>}
            </tr>
          </thead>
          <tbody>
            {lignes.map((l) => (
              <tr key={l.id} className="border-t border-[#EEF1F4]">
                <td className="px-5 py-3">
                  <span className="flex flex-col gap-0.5">
                    <span className="flex flex-wrap items-center gap-2 font-medium text-odon-encre">
                      {l.nom}
                      {l.ponctuel && <span className="rounded-full border border-odon-turquoise bg-[#E6F7FB] px-2 py-0.5 text-[11px] font-bold text-odon-bleu">Ponctuel</span>}
                    </span>
                    <span className="text-xs text-odon-gris-texte">{[l.reference && `Réf. ${l.reference}`, l.note].filter(Boolean).join(" · ") || "—"}</span>
                  </span>
                </td>
                <td className="px-3 py-3 text-[#33404B]">{l.fournisseur}</td>
                <td className="px-3 py-3 text-right font-semibold">{l.quantite_commandee} {pluriel(l.unite, l.quantite_commandee)}</td>
                <td className={`px-3 py-3 text-right font-semibold ${l.quantite_recue >= l.quantite_commandee ? "text-[#166534]" : l.quantite_recue > 0 ? "text-[#A16207]" : "text-odon-gris-texte"}`}>
                  {l.quantite_recue}/{l.quantite_commandee}
                </td>
                {valeurs && <td className="px-5 py-3 text-right">{l.prix_unitaire == null ? "—" : formaterPrix(Number(l.prix_unitaire) * l.quantite_commandee)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
        {valeurs && <p className="border-t border-[#EEF1F4] px-5 py-3 text-right text-sm font-semibold text-odon-encre">Total estimé : {formaterPrix(total)}</p>}
      </div>
    </div>
  );
}

export default function PageCommande(props: Props) {
  return (
    <Coque titre="Détail de la commande" actions={<Link href="/commandes?onglet=historique" className={classesBoutonSecondaire}>← Historique</Link>}>
      <Suspense fallback={<p className="text-odon-gris-texte">Chargement…</p>}>
        <Detail {...props} />
      </Suspense>
    </Coque>
  );
}
