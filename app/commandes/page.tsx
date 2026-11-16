import { Suspense } from "react";
import Link from "next/link";
import Coque from "@/components/coque";
import { creerClientServeur } from "@/lib/supabase/server";
import { lireProfil, nomDe, peutGerer, voitValeurs } from "@/lib/profil";
import { dateCourteParis, formaterPrix } from "@/lib/format";
import { calculerPropositions, STATUTS_COMMANDE, TYPES_COMMANDE, type TypeCommande } from "@/lib/commandes";
import EditeurCommande from "./editeur";

export const metadata = { title: "Commandes · OdonStock" };

type Props = { searchParams: Promise<{ onglet?: string }> };

const ONGLETS = [
  { id: "mensuelle", label: "Commande du mois" },
  { id: "reassort", label: "Réassort du 1er au 5" },
  { id: "urgence", label: "Urgences" },
  { id: "historique", label: "Historique" },
];

async function Historique({ centreId, valeurs }: { centreId: string; valeurs: boolean }) {
  const supabase = await creerClientServeur();
  const { data } = await supabase
    .from("commandes")
    .select("id, type, statut, validee_le, cree_le, commande_lignes(quantite_commandee, quantite_recue, prix_unitaire)")
    .eq("centre_id", centreId)
    .order("cree_le", { ascending: false })
    .limit(50);

  if (!data?.length) {
    return <p className="rounded-xl border border-[#E3E7EB] bg-white px-6 py-10 text-center text-sm text-odon-gris-texte">Aucune commande validée pour l&apos;instant.</p>;
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-[#E3E7EB] bg-white">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="text-left text-[13px] text-odon-gris-texte">
            <th scope="col" className="px-5 py-3 font-medium">Date</th>
            <th scope="col" className="px-3 py-3 font-medium">Type</th>
            <th scope="col" className="px-3 py-3 text-right font-medium">Lignes</th>
            {valeurs && <th scope="col" className="px-3 py-3 text-right font-medium">Montant estimé</th>}
            <th scope="col" className="px-3 py-3 font-medium">Statut</th>
            <th scope="col" className="px-5 py-3"><span className="sr-only">Ouvrir</span></th>
          </tr>
        </thead>
        <tbody>
          {data.map((c) => {
            const lignes = (c.commande_lignes ?? []) as { quantite_commandee: number; prix_unitaire: number | null }[];
            const montant = lignes.reduce((n, l) => n + (Number(l.prix_unitaire) || 0) * l.quantite_commandee, 0);
            const statut = STATUTS_COMMANDE[c.statut] ?? STATUTS_COMMANDE.proposee;
            return (
              <tr key={c.id} className="border-t border-[#EEF1F4]">
                <td className="px-5 py-3 text-[#33404B]">{dateCourteParis(c.validee_le ?? c.cree_le)}</td>
                <td className="px-3 py-3 font-medium text-odon-encre">{TYPES_COMMANDE[c.type as TypeCommande]?.label ?? c.type}</td>
                <td className="px-3 py-3 text-right">{lignes.length}</td>
                {valeurs && <td className="px-3 py-3 text-right font-semibold">{formaterPrix(montant)}</td>}
                <td className="px-3 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statut.classes}`}>{statut.label}</span></td>
                <td className="px-5 py-3 text-right"><Link href={`/commandes/${c.id}`} className="text-sm font-semibold text-odon-bleu hover:underline">Ouvrir</Link></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

async function Contenu({ searchParams }: Props) {
  const { onglet: demande } = await searchParams;
  const onglet = ONGLETS.find((o) => o.id === demande)?.id ?? "mensuelle";
  const profil = await lireProfil();
  if (!profil?.centre_id) {
    return <p className="rounded-xl bg-[#FEF3C7] px-4 py-3 font-medium text-[#854D0E]">Votre compte n&apos;est rattaché à aucun centre.</p>;
  }
  const valeurs = voitValeurs(profil);
  const supabase = await creerClientServeur();

  let contenu: React.ReactNode;
  if (onglet === "historique") {
    contenu = <Historique centreId={profil.centre_id} valeurs={valeurs} />;
  } else {
    const type = onglet as TypeCommande;
    const [propositions, { data: catalogue }] = await Promise.all([
      calculerPropositions(supabase, profil.centre_id, type),
      supabase.from("produits").select("id, nom, reference, unite_achat, prix_achat, fournisseurs(nom)").eq("actif", true).order("nom"),
    ]);
    contenu = (
      <>
        <p className="text-sm text-odon-gris-texte">{TYPES_COMMANDE[type].texte}</p>
        <EditeurCommande
          key={type}
          type={type}
          propositions={valeurs ? propositions : propositions.map((p) => ({ ...p, prix: null }))}
          catalogue={(catalogue ?? []).map((a) => ({
            id: a.id,
            nom: a.nom,
            reference: a.reference,
            uniteAchat: a.unite_achat,
            prix: valeurs && a.prix_achat != null ? Number(a.prix_achat) : null,
            fournisseur: nomDe(a.fournisseurs) ?? "Sans fournisseur",
          }))}
          voitValeurs={valeurs}
          modifiable={peutGerer(profil)}
        />
      </>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <nav aria-label="Type de commande" className="-mx-1 flex gap-1 overflow-x-auto border-b border-[#D5DBE0] px-1">
        {ONGLETS.map((o) => (
          <Link
            key={o.id}
            href={`/commandes?onglet=${o.id}`}
            aria-current={o.id === onglet ? "page" : undefined}
            className={`-mb-px shrink-0 border-b-[3px] px-4 py-3 text-sm transition ${o.id === onglet ? "border-odon-turquoise font-semibold text-odon-bleu" : "border-transparent font-medium text-odon-gris-texte hover:text-odon-encre"}`}
          >
            {o.label}
          </Link>
        ))}
      </nav>
      {contenu}
    </div>
  );
}

export default function PageCommandes({ searchParams }: Props) {
  return (
    <Coque titre="Commandes" sousTitre="Propositions calculées sur la consommation réelle · à valider, puis à passer sur Dentira">
      <Suspense fallback={<p className="text-odon-gris-texte">Calcul des propositions…</p>}>
        <Contenu searchParams={searchParams} />
      </Suspense>
    </Coque>
  );
}
