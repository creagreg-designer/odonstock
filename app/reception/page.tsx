import { Suspense } from "react";
import Coque, { LectureSeule } from "@/components/coque";
import DerniersMouvements from "@/components/derniers-mouvements";
import { creerClientServeur } from "@/lib/supabase/server";
import { lireProfil, peutSaisir } from "@/lib/profil";
import { produitsAvecStock } from "@/lib/produits";
import { dateCourteParis } from "@/lib/format";
import Link from "next/link";
import SaisieReception from "./saisie";

export const metadata = { title: "Réception · OdonStock" };

async function Contenu({ searchParams }: Props) {
  const { commande } = await searchParams;
  const profil = await lireProfil();
  if (!profil?.centre_id) {
    return <p className="rounded-xl bg-[#FEF3C7] px-4 py-3 font-medium text-[#854D0E]">Votre compte n&apos;est rattaché à aucun centre.</p>;
  }
  if (!peutSaisir(profil)) return <LectureSeule texte="Les réceptions sont saisies par les équipes du centre ; les dernières réceptions sont listées à côté." />;
  const supabase = await creerClientServeur();
  const produits = await produitsAvecStock(supabase, profil.centre_id);

  // Réception d'une commande : les quantités restant à recevoir sont pré-remplies
  if (commande) {
    const { data: c } = await supabase
      .from("commandes")
      .select("id, type, validee_le, commande_lignes(produit_id, quantite_commandee, quantite_recue)")
      .eq("id", commande)
      .single();
    if (c) {
      const restantes = ((c.commande_lignes ?? []) as { produit_id: string; quantite_commandee: number; quantite_recue: number }[])
        .filter((l) => l.quantite_commandee > l.quantite_recue)
        .map((l) => ({ id: l.produit_id, achats: l.quantite_commandee - l.quantite_recue }));
      return (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#E6F7FB] px-5 py-3.5 text-sm text-odon-bleu">
            <span>
              <strong>Réception de la commande du {dateCourteParis(c.validee_le ?? "")}</strong> · {restantes.length} ligne(s) à pointer, pré-remplies avec les quantités attendues. Corrigez ce qui manque.
            </span>
            <Link href={`/commandes/${c.id}`} className="font-semibold underline">Voir la commande</Link>
          </div>
          <SaisieReception key={c.id} produits={produits} initiales={restantes} commandeId={c.id} />
        </div>
      );
    }
  }
  return <SaisieReception produits={produits} />;
}

type Props = { searchParams: Promise<{ commande?: string }> };

export default function PageReception({ searchParams }: Props) {
  return (
    <Coque
      titre="Réception"
      sousTitre="Entrée en stock des produits livrés · depuis une commande (Commandes → Réceptionner) ou hors commande"
    >
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,7fr)_minmax(0,4fr)]">
        <Suspense fallback={<p className="text-odon-gris-texte">Chargement…</p>}>
          <Contenu searchParams={searchParams} />
        </Suspense>
        <Suspense fallback={null}>
          <DerniersMouvements type="entree" titre="Dernières réceptions" />
        </Suspense>
      </div>
    </Coque>
  );
}
