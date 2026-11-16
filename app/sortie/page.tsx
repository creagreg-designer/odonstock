import { Suspense } from "react";
import Coque, { LectureSeule } from "@/components/coque";
import DerniersMouvements from "@/components/derniers-mouvements";
import { creerClientServeur } from "@/lib/supabase/server";
import { lireProfil, peutSaisir } from "@/lib/profil";
import { produitsAvecStock } from "@/lib/produits";
import Caisse from "./caisse";

export const metadata = { title: "Sortie de stock · OdonStock" };

async function Contenu() {
  const profil = await lireProfil();
  if (!profil?.centre_id) {
    return <p className="rounded-xl bg-[#FEF3C7] px-4 py-3 font-medium text-[#854D0E]">Votre compte n&apos;est rattaché à aucun centre.</p>;
  }
  if (!peutSaisir(profil)) return <LectureSeule texte="Les sorties sont faites par les équipes du centre ; vous pouvez consulter les dernières sorties ci-dessous." />;
  const supabase = await creerClientServeur();
  const [produits, { data: lieux }] = await Promise.all([
    produitsAvecStock(supabase, profil.centre_id),
    supabase.from("lieux").select("id, nom").eq("centre_id", profil.centre_id).eq("actif", true).order("ordre"),
  ]);
  return <Caisse produits={produits} lieux={(lieux ?? []).map((l) => ({ id: l.id, nom: l.nom }))} />;
}

export default function PageSortie() {
  return (
    <Coque titre="Sortie de stock" sousTitre="Scannez les produits, puis touchez le cabinet de destination">
      <div className="flex flex-col gap-6">
        <Suspense fallback={<p className="text-odon-gris-texte">Chargement…</p>}>
          <Contenu />
        </Suspense>
        <Suspense fallback={null}>
          <DerniersMouvements type="sortie" titre="Dernières sorties" />
        </Suspense>
      </div>
    </Coque>
  );
}
