import { Suspense } from "react";
import Link from "next/link";
import Coque, { classesBoutonSecondaire } from "@/components/coque";
import { creerClientServeur } from "@/lib/supabase/server";
import { lireProfil, peutSaisir } from "@/lib/profil";
import { dateCourteParis, heureParis, jourParis } from "@/lib/format";
import EmpruntRapide from "./emprunt-rapide";
import ListeEmpruntes, { type Groupe } from "./liste-empruntes";

export const metadata = { title: "Scan posts · OdonStock" };

async function Contenu() {
  const profil = await lireProfil();
  if (!profil?.centre_id) {
    return <p className="rounded-xl bg-[#FEF3C7] px-4 py-3 font-medium text-[#854D0E]">Votre compte n&apos;est rattaché à aucun centre.</p>;
  }
  const supabase = await creerClientServeur();
  const maintenant = new Date();
  const aujourdhui = jourParis(maintenant);
  const debutMois = `${aujourdhui.slice(0, 7)}-01T00:00:00`;

  const [{ data: tailles }, { data: personnes }, { data: enCours }, { data: pertes }] = await Promise.all([
    supabase.from("scan_post_tailles").select("id, nom, quantite_totale").eq("centre_id", profil.centre_id).order("ordre"),
    supabase.from("personnes").select("id, prenom, nom").eq("centre_id", profil.centre_id).eq("actif", true).order("prenom"),
    supabase.from("scan_posts_en_cours").select("personne_id, taille_id, quantite, dernier_emprunt").eq("centre_id", profil.centre_id),
    supabase.from("scan_post_mouvements").select("taille_id, quantite").eq("centre_id", profil.centre_id).eq("type", "perte").gte("cree_le", debutMois),
  ]);

  const nomTaille = new Map((tailles ?? []).map((t) => [t.id, t.nom as string]));
  const ordreTaille = new Map((tailles ?? []).map((t, i) => [t.id, i]));
  const sommePar = (lignes: { taille_id: string; quantite: number }[] | null, id: string) =>
    (lignes ?? []).filter((l) => l.taille_id === id).reduce((n, l) => n + l.quantite, 0);

  const cartes = (tailles ?? []).map((t) => {
    const dehors = sommePar(enCours, t.id);
    return { id: t.id, nom: t.nom, total: t.quantite_totale, dehors, dispo: Math.max(t.quantite_totale - dehors, 0), perdus: sommePar(pertes, t.id) };
  });

  const groupes: Groupe[] = (personnes ?? [])
    .map((p) => {
      const lignes = (enCours ?? []).filter((l) => l.personne_id === p.id);
      if (!lignes.length) return null;
      const dernier = lignes.map((l) => l.dernier_emprunt as string).sort().at(-1)!;
      const nonRendu = jourParis(dernier) < aujourdhui;
      return {
        personneId: p.id,
        prenom: p.prenom,
        items: lignes
          .sort((a, b) => (ordreTaille.get(a.taille_id) ?? 0) - (ordreTaille.get(b.taille_id) ?? 0))
          .map((l) => ({ tailleId: l.taille_id, nom: nomTaille.get(l.taille_id) ?? "?", quantite: l.quantite })),
        info: nonRendu
          ? `Emprunté le ${dateCourteParis(dernier)} à ${heureParis(dernier)} · non rendu`
          : `Emprunté à ${heureParis(dernier)}`,
        nonRendu,
      };
    })
    .filter((g): g is Groupe => g !== null)
    .sort((a, b) => Number(b.nonRendu) - Number(a.nonRendu));

  const pertesMois = cartes.reduce((n, c) => n + c.perdus, 0);

  if (!cartes.length) {
    return <p className="rounded-xl bg-white px-6 py-10 text-center text-odon-gris-texte">Aucune taille de scan post n&apos;est encore enregistrée pour ce centre.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <section aria-label="Stock par taille" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cartes.map((c) => (
          <div key={c.id} className="flex flex-col gap-3 rounded-xl border border-[#E3E7EB] bg-white p-4">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-base font-bold text-odon-encre">{c.nom}</span>
              <span className="text-xs text-odon-gris-texte">{c.total} au total</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-3xl font-bold ${c.dispo <= 1 ? "text-odon-alerte" : "text-odon-encre"}`}>{c.dispo}</span>
              <span className="text-sm text-odon-gris-texte">disponible{c.dispo > 1 ? "s" : ""}</span>
            </div>
            <div className="flex h-2 overflow-hidden rounded-full bg-[#E6E8EB]" aria-hidden="true">
              <div className="bg-odon-turquoise" style={{ width: `${c.total ? (c.dispo / c.total) * 100 : 0}%` }} />
              <div className="bg-odon-bleu" style={{ width: `${c.total ? (c.dehors / c.total) * 100 : 0}%` }} />
            </div>
            <div className="flex justify-between text-xs text-odon-gris-texte">
              <span>{c.dehors} emprunté{c.dehors > 1 ? "s" : ""}</span>
              <span>{c.perdus} perdu{c.perdus > 1 ? "s" : ""} ce mois</span>
            </div>
          </div>
        ))}
        <div className="flex flex-col justify-between gap-3 rounded-xl border border-[#F0C3AE] bg-[#FFF7F3] p-4">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-base font-bold text-odon-encre">Pertes ce mois-ci</span>
            <span className="text-xs text-odon-gris-texte">toutes tailles</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-3xl font-bold ${pertesMois ? "text-odon-alerte" : "text-odon-encre"}`}>{pertesMois}</span>
            <span className="text-sm text-odon-gris-texte">scan post{pertesMois > 1 ? "s" : ""} perdu{pertesMois > 1 ? "s" : ""}</span>
          </div>
          <Link href="/scan-posts/historique?type=perte" className="text-xs font-semibold text-odon-bleu hover:underline">Voir le détail des pertes</Link>
        </div>
      </section>

      <ListeEmpruntes groupes={groupes} lectureSeule={!peutSaisir(profil)} />
    </div>
  );
}

// Bouton « Emprunter » de l'en-tête : charge les tailles disponibles et les assistantes
async function BoutonEmprunt() {
  const profil = await lireProfil();
  if (!profil?.centre_id || !peutSaisir(profil)) return null;
  const supabase = await creerClientServeur();
  const [{ data: tailles }, { data: enCours }, { data: personnes }] = await Promise.all([
    supabase.from("scan_post_tailles").select("id, nom, quantite_totale").eq("centre_id", profil.centre_id).order("ordre"),
    supabase.from("scan_posts_en_cours").select("taille_id, quantite").eq("centre_id", profil.centre_id),
    supabase.from("personnes").select("id, prenom").eq("centre_id", profil.centre_id).eq("actif", true).order("prenom"),
  ]);
  if (!tailles?.length) return null;
  const dehors = (id: string) => (enCours ?? []).filter((l) => l.taille_id === id).reduce((n, l) => n + (l.quantite as number), 0);
  return (
    <EmpruntRapide
      tailles={tailles.map((t) => ({ id: t.id, nom: t.nom, dispo: Math.max(t.quantite_totale - dehors(t.id), 0) }))}
      personnes={(personnes ?? []).map((p) => ({ id: p.id, prenom: p.prenom }))}
    />
  );
}

export default function PageScanPosts() {
  return (
    <Coque
      titre="Scan posts"
      sousTitre="Emprunt pour une empreinte numérique, puis retour après désinfection"
      actions={
        <>
          <Suspense fallback={null}>
            <BoutonEmprunt />
          </Suspense>
          <Link href="/scan-posts/historique" className={classesBoutonSecondaire}>Historique</Link>
        </>
      }
    >
      <Suspense fallback={<p className="text-odon-gris-texte">Chargement…</p>}>
        <Contenu />
      </Suspense>
    </Coque>
  );
}
