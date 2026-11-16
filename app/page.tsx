// Tableau de bord provisoire : il sera construit une fois les premières données saisies.
import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import Coque from "@/components/coque";
import { creerClientServeur } from "@/lib/supabase/server";
import { lireProfil, prenomDe } from "@/lib/profil";
import { calculerAlertes } from "@/lib/alertes";

// Raccourcis colorés vers les gestes du quotidien
const RACCOURCIS = [
  { href: "/sortie", titre: "Nouvelle sortie", texte: "Scanner des produits", fond: "bg-odon-bleu", d: "M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 12h10" },
  { href: "/scan-posts", titre: "Scan posts", texte: "Emprunter, rendre", fond: "bg-[#007E99]", d: "M9 3h6v6H9zM10 9h4v8l-2 4-2-4zM10 12.5h4M10 15.5h4" },
  { href: "/rotatifs", titre: "Rotatifs", texte: "État du parc", fond: "bg-odon-nuit", d: "M3 10h11l5-3v10l-5-3H3zM6 10v4M14 7v10" },
  { href: "/reception", titre: "Réception", texte: "Pointer une livraison", fond: "bg-[#5B4BC4]", d: "M21 8l-9-5-9 5v8l9 5 9-5V8zM3 8l9 5 9-5M12 13v8" },
];

async function Etat() {
  const profil = await lireProfil();
  if (profil?.role === "poste" && !profil.centre_id) {
    return (
      <p className="rounded-xl bg-[#FEF3C7] px-4 py-3 font-medium text-[#854D0E]">
        Votre compte n&apos;a pas encore d&apos;accès. Demandez à l&apos;administrateur de vous attribuer un rôle et un centre.
      </p>
    );
  }
  const supabase = await creerClientServeur();
  const centreId = profil?.centre_id ?? "";
  const [{ count: nbProduits }, { data: empruntes }, alertes, { count: nbLieux }] = await Promise.all([
    supabase.from("produits").select("*", { count: "exact", head: true }).eq("actif", true),
    supabase.from("scan_posts_en_cours").select("quantite").eq("centre_id", centreId),
    centreId ? calculerAlertes(supabase, centreId) : Promise.resolve([]),
    supabase.from("lieux").select("*", { count: "exact", head: true }).eq("actif", true),
  ]);
  const nbEmpruntes = (empruntes ?? []).reduce((n, l) => n + (l.quantite as number), 0);
  const nbRuptures = alertes.filter((a) => a.type === "rupture").length;

  const indicateurs = [
    { label: "Produits au catalogue", valeur: nbProduits ?? 0, note: "références suivies", pastille: "bg-[#E6F7FB] text-[#007E99]", d: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5v14z" },
    { label: "Scan posts empruntés", valeur: nbEmpruntes, note: "en ce moment", pastille: "bg-[#E8EEF7] text-odon-bleu", d: "M9 3h6v6H9zM10 9h4v8l-2 4-2-4z" },
    { label: "Alertes de stock", valeur: alertes.length, note: nbRuptures ? `dont ${nbRuptures} rupture${nbRuptures > 1 ? "s" : ""}` : "aucune rupture", pastille: alertes.length ? "bg-[#FDECE3] text-odon-alerte" : "bg-[#E3F4EA] text-[#166534]", d: "M12 3l10 18H2L12 3zM12 10v4M12 17h.01" },
    { label: "Lieux de sortie", valeur: nbLieux ?? 0, note: "cabinets et salles", pastille: "bg-[#EEEBFA] text-[#5B4BC4]", d: "M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <section aria-label="Raccourcis" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {RACCOURCIS.map((r) => (
          <Link key={r.href} href={r.href} className={`group relative flex min-h-[112px] flex-col justify-between overflow-hidden rounded-2xl p-5 text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${r.fond}`}>
            <svg viewBox="0 0 40 40" aria-hidden="true" className="pointer-events-none absolute -bottom-6 -right-6 h-28 w-28 text-white/10">
              <g fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                <path d="M4 12V9a5 5 0 0 1 5-5h3M28 4h3a5 5 0 0 1 5 5v3M36 28v3a5 5 0 0 1-5 5h-3M12 36H9a5 5 0 0 1-5-5v-3" />
              </g>
            </svg>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={r.d} /></svg>
            </span>
            <span>
              <span className="block font-titre text-lg font-semibold">{r.titre}</span>
              <span className="block text-sm text-white/80">{r.texte}</span>
            </span>
          </Link>
        ))}
      </section>

      <section aria-label="Indicateurs" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {indicateurs.map((c) => (
          <div key={c.label} className="flex items-start gap-4 rounded-2xl border border-[#E3E7EB] bg-white p-5">
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${c.pastille}`}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={c.d} /></svg>
            </span>
            <span className="flex flex-col">
              <span className="text-sm font-medium text-odon-gris-texte">{c.label}</span>
              <span className="font-titre text-3xl font-semibold text-odon-nuit">{c.valeur}</span>
              <span className="text-xs text-odon-gris-texte">{c.note}</span>
            </span>
          </div>
        ))}
      </section>

      {(nbProduits ?? 0) === 0 && (
        <div className="relative flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-2xl bg-gradient-to-r from-odon-nuit to-odon-bleu px-6 py-6 text-white">
          <div>
            <p className="font-titre text-xl font-semibold">Première étape : remplir le catalogue</p>
            <p className="mt-1 text-sm text-[#BFDDF0]">Ajoutez vos produits pour commencer à suivre le stock.</p>
          </div>
          <Link href="/catalogue/nouveau" className="inline-flex h-11 items-center rounded-lg bg-[#00C8E8] px-5 text-sm font-semibold text-odon-nuit hover:bg-[#4FDCF2]">
            Ajouter un produit
          </Link>
        </div>
      )}
    </div>
  );
}

// Proposition graphique : surtitre (date · centre), salutation en grand, phrase d'accroche
async function EnteteAccueil() {
  await connection();
  const profil = await lireProfil();
  const date = new Date().toLocaleDateString("fr-FR", {
    timeZone: "Europe/Paris",
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const prenom = prenomDe(profil);
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-odon-turquoise-texte">
        {date}
        {profil?.centre_nom ? ` · ${profil.centre_nom}` : ""}
      </p>
      <h1 className="font-titre text-[32px] font-semibold leading-tight tracking-tight text-odon-nuit sm:text-[38px]">
        Bonjour{prenom ? ` ${prenom}` : ""}
      </h1>
      <p className="text-[15px] text-odon-gris-texte">Voici l&apos;état du stock aujourd&apos;hui.</p>
    </div>
  );
}

function EnteteAttente() {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-odon-turquoise-texte">&nbsp;</p>
      <h1 className="font-titre text-[32px] font-semibold leading-tight tracking-tight text-odon-nuit sm:text-[38px]">Tableau de bord</h1>
      <p className="text-[15px] text-odon-gris-texte">&nbsp;</p>
    </div>
  );
}

export default function Accueil() {
  return (
    <Coque
      titre="Tableau de bord"
      entete={
        <Suspense fallback={<EnteteAttente />}>
          <EnteteAccueil />
        </Suspense>
      }
    >
      <Suspense fallback={<p className="text-odon-gris-texte">Chargement…</p>}>
        <Etat />
      </Suspense>
    </Coque>
  );
}
