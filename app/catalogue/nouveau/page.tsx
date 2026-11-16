import { Suspense } from "react";
import Coque from "@/components/coque";
import Formulaire from "./formulaire";

export const metadata = { title: "Ajouter un produit · OdonStock" };

type Props = { searchParams: Promise<{ erreur?: string }> };

export default function PageNouveauProduit({ searchParams }: Props) {
  return (
    <Coque titre="Ajouter un produit" sousTitre="Le produit apparaîtra aussitôt dans le catalogue">
      <Suspense fallback={<p className="text-odon-gris-texte">Chargement…</p>}>
        <Formulaire searchParams={searchParams} />
      </Suspense>
    </Coque>
  );
}
