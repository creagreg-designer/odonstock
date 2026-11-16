import { Suspense } from "react";
import Coque, { LectureSeule } from "@/components/coque";
import { creerClientServeur } from "@/lib/supabase/server";
import { lireProfil, peutSaisir } from "@/lib/profil";
import { produitsAvecStock } from "@/lib/produits";
import Feuille from "./feuille";

export const metadata = { title: "Comptage · OdonStock" };

type Props = { searchParams: Promise<{ zone?: string }> };

async function Contenu({ searchParams }: Props) {
  const { zone = "tout" } = await searchParams;
  const profil = await lireProfil();
  if (!profil?.centre_id) return null;
  if (!peutSaisir(profil)) return <LectureSeule texte="Les comptages sont réalisés par les équipes du centre." />;
  const supabase = await creerClientServeur();
  const categorieId = zone === "tout" ? null : zone;

  const [tous, { data: dansZone }, { data: categorie }] = await Promise.all([
    produitsAvecStock(supabase, profil.centre_id),
    categorieId
      ? supabase.from("produits").select("id").eq("actif", true).eq("categorie_id", categorieId)
      : Promise.resolve({ data: null }),
    categorieId ? supabase.from("categories").select("nom").eq("id", categorieId).single() : Promise.resolve({ data: null }),
  ]);
  const ids = dansZone ? new Set(dansZone.map((p) => p.id as string)) : null;
  const produitsZone = ids ? tous.filter((p) => ids.has(p.id)) : tous;

  return (
    <>
      <p className="mb-4 -mt-3 text-sm font-semibold text-odon-bleu">
        Zone : {categorie?.nom ?? "Inventaire complet"} · {produitsZone.length} produit{produitsZone.length > 1 ? "s" : ""}
      </p>
      <Feuille zone={categorieId} produitsZone={produitsZone} tousProduits={tous} />
    </>
  );
}

export default function PageComptage({ searchParams }: Props) {
  return (
    <Coque titre="Comptage" sousTitre="Scannez chaque boîte ou saisissez les quantités, puis validez">
      <Suspense fallback={<p className="text-odon-gris-texte">Chargement…</p>}>
        <Contenu searchParams={searchParams} />
      </Suspense>
    </Coque>
  );
}
