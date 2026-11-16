import { Suspense } from "react";
import Link from "next/link";
import Coque, { classesBouton } from "@/components/coque";
import ListeProduits from "./liste";

export const metadata = { title: "Catalogue · OdonStock" };

type Props = { searchParams: Promise<{ q?: string; categorie?: string; ajoute?: string }> };

export default function PageCatalogue({ searchParams }: Props) {
  return (
    <Coque
      titre="Catalogue"
      sousTitre="Catalogue commun du groupe et références propres au centre"
      actions={
        <Link href="/catalogue/nouveau" className={classesBouton}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
          Ajouter un produit
        </Link>
      }
    >
      <Suspense fallback={<p className="text-odon-gris-texte">Chargement du catalogue…</p>}>
        <ListeProduits searchParams={searchParams} />
      </Suspense>
    </Coque>
  );
}
