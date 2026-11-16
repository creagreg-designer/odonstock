import { Suspense } from "react";
import Link from "next/link";
import Coque from "@/components/coque";
import { creerClientServeur } from "@/lib/supabase/server";
import { lireProfil, peutGerer, ROLES } from "@/lib/profil";
import * as A from "./actions";
import ListeParametres from "./liste-parametres";
import QuantiteTaille from "./quantite-taille";
import LigneUtilisateur from "./ligne-utilisateur";

export const metadata = { title: "Paramètres · OdonStock" };

type Props = { searchParams: Promise<{ onglet?: string }> };

const ONGLETS = [
  { id: "lieux", label: "Cabinets et lieux", admin: false },
  { id: "assistantes", label: "Assistantes", admin: false },
  { id: "scan-posts", label: "Scan posts", admin: false },
  { id: "categories", label: "Catégories", admin: true },
  { id: "utilisateurs", label: "Utilisateurs", admin: true },
];

function Intro({ titre, texte }: { titre: string; texte: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-semibold text-odon-encre">{titre}</h2>
      <p className="mt-0.5 text-sm text-odon-gris-texte">{texte}</p>
    </div>
  );
}

async function Contenu({ searchParams }: Props) {
  const { onglet: demande } = await searchParams;
  const profil = await lireProfil();
  if (!profil) return null;
  const admin = profil.role === "admin";
  const gestion = peutGerer(profil);
  const onglets = ONGLETS.filter((o) => !o.admin || admin);
  const onglet = onglets.find((o) => o.id === demande)?.id ?? "lieux";
  const supabase = await creerClientServeur();
  const centreId = profil.centre_id ?? "";

  let contenu: React.ReactNode = null;

  if (onglet === "lieux") {
    const { data } = await supabase.from("lieux").select("id, nom, actif").eq("centre_id", centreId).order("ordre").order("nom");
    contenu = (
      <>
        <Intro titre="Cabinets et lieux de sortie" texte="Les destinations proposées lors d'une sortie de stock. Un lieu désactivé n'est plus proposé mais reste dans l'historique." />
        <ListeParametres
          elements={(data ?? []).map((l) => ({ id: l.id, libelle: l.nom, actif: l.actif }))}
          modifiable={gestion}
          placeholder="Nom du nouveau lieu (ex. Cabinet 11)"
          vide="Aucun lieu pour l'instant."
          onAjouter={A.ajouterLieu}
          onRenommer={A.renommerLieu}
          onBasculer={A.basculerLieu}
          onDeplacer={A.deplacerLieu}
        />
      </>
    );
  } else if (onglet === "assistantes") {
    const { data } = await supabase.from("personnes").select("id, prenom, actif").eq("centre_id", centreId).order("prenom");
    contenu = (
      <>
        <Intro titre="Assistantes" texte="Les prénoms proposés lors de l'emprunt d'un scan post. Une assistante désactivée n'apparaît plus mais reste dans l'historique." />
        <ListeParametres
          elements={(data ?? []).map((p) => ({ id: p.id, libelle: p.prenom, actif: p.actif }))}
          modifiable={gestion}
          placeholder="Prénom de la nouvelle assistante"
          vide="Aucune assistante pour l'instant."
          onAjouter={A.ajouterPersonne}
          onRenommer={A.renommerPersonne}
          onBasculer={A.basculerPersonne}
        />
      </>
    );
  } else if (onglet === "scan-posts") {
    const { data } = await supabase.from("scan_post_tailles").select("id, nom, quantite_totale").eq("centre_id", centreId).order("ordre");
    contenu = (
      <>
        <Intro titre="Tailles de scan posts" texte="Les tailles proposées et leur ordre d'affichage." />
        <ListeParametres
          elements={(data ?? []).map((t) => ({ id: t.id, libelle: t.nom }))}
          modifiable={gestion}
          placeholder="Nouvelle taille (ex. PL 1.7)"
          vide="Aucune taille pour l'instant."
          onAjouter={A.ajouterTaille}
          onRenommer={A.renommerTaille}
          onDeplacer={A.deplacerTaille}
        />
        <div className="mt-8">
          <Intro titre="Quantités en stock" texte="Après un achat de scan posts, augmentez le total de la taille concernée. Les pertes le diminuent automatiquement." />
          <ul className="rounded-xl border border-[#E3E7EB] bg-white">
            {(data ?? []).map((t) => (
              <QuantiteTaille key={t.id} id={t.id} nom={t.nom} quantite={t.quantite_totale} modifiable={gestion} />
            ))}
          </ul>
        </div>
      </>
    );
  } else if (onglet === "categories") {
    const { data } = await supabase.from("categories").select("id, nom").is("parent_id", null).order("ordre");
    contenu = (
      <>
        <Intro titre="Catégories du catalogue" texte="Communes à tous les centres du groupe, pour que les comparaisons restent justes. Réservées à l'administrateur." />
        <ListeParametres
          elements={(data ?? []).map((c) => ({ id: c.id, libelle: c.nom }))}
          modifiable={admin}
          placeholder="Nom de la nouvelle catégorie"
          vide="Aucune catégorie."
          onAjouter={A.ajouterCategorie}
          onRenommer={A.renommerCategorie}
          onDeplacer={A.deplacerCategorie}
        />
      </>
    );
  } else if (onglet === "utilisateurs") {
    const [{ data: profils }, { data: centres }] = await Promise.all([
      supabase.from("profils").select("id, nom, role, centre_id").order("nom"),
      supabase.from("centres").select("id, nom").order("nom"),
    ]);
    contenu = (
      <>
        <Intro titre="Utilisateurs" texte="Le rôle et le centre de chaque compte. Un nouveau compte n'a aucun accès tant qu'un rôle et un centre ne lui sont pas attribués." />
        <div className="overflow-x-auto rounded-xl border border-[#E3E7EB] bg-white">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="text-left text-[13px] text-odon-gris-texte">
                <th scope="col" className="px-5 py-3 font-medium">Prénom et nom</th>
                <th scope="col" className="px-3 py-3 font-medium">Rôle</th>
                <th scope="col" className="px-3 py-3 font-medium">Centre</th>
                <th scope="col" className="px-5 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {(profils ?? []).map((p) => (
                <LigneUtilisateur
                  key={p.id}
                  id={p.id}
                  nom={p.nom ?? ""}
                  role={p.role}
                  centreId={p.centre_id}
                  centres={(centres ?? []).map((c) => ({ id: c.id, nom: c.nom }))}
                  roles={ROLES}
                  moi={p.id === profil.id}
                />
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 rounded-xl bg-odon-gris px-5 py-4 text-sm text-odon-gris-texte">
          <p className="font-semibold text-odon-encre">Créer un nouveau compte</p>
          <p className="mt-1">
            Pour l&apos;instant, dans Supabase : Authentication → Users → Add user (e-mail et mot de passe provisoire).
            Le compte apparaît ensuite ici : attribuez-lui son rôle et son centre.
          </p>
        </div>
      </>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {!gestion && (
        <p className="rounded-xl bg-[#E6F7FB] px-4 py-3 text-sm text-odon-bleu">
          Vous pouvez consulter les réglages ; seuls l&apos;administrateur et le responsable de stock peuvent les modifier.
        </p>
      )}
      <nav aria-label="Rubriques des paramètres" className="-mx-1 flex gap-1 overflow-x-auto border-b border-[#D5DBE0] px-1">
        {onglets.map((o) => (
          <Link
            key={o.id}
            href={`/parametres?onglet=${o.id}`}
            aria-current={o.id === onglet ? "page" : undefined}
            className={`-mb-px shrink-0 border-b-[3px] px-4 py-3 text-sm transition ${
              o.id === onglet ? "border-odon-turquoise font-semibold text-odon-bleu" : "border-transparent font-medium text-odon-gris-texte hover:text-odon-encre"
            }`}
          >
            {o.label}
          </Link>
        ))}
      </nav>
      <section className="max-w-3xl">{contenu}</section>
    </div>
  );
}

export default function PageParametres({ searchParams }: Props) {
  return (
    <Coque titre="Paramètres" sousTitre="Les réglages du centre et de l'application">
      <Suspense fallback={<p className="text-odon-gris-texte">Chargement…</p>}>
        <Contenu searchParams={searchParams} />
      </Suspense>
    </Coque>
  );
}
