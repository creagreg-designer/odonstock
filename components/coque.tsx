// Mise en page commune : menu à gauche, titre de page, contenu.
import { Suspense } from "react";
import { connection } from "next/server";
import Cloche from "./cloche";
import FenetreNotifications from "./fenetre-notifications";
import MenuLateral from "./menu-lateral";
import BoutonDeconnexion from "@/app/bouton-deconnexion";
import { lireProfil, prenomDe, ROLES } from "@/lib/profil";

async function Utilisateur() {
  await connection();
  const profil = await lireProfil();
  if (!profil) return null;
  const initiales = (profil.nom ?? "?")
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((m) => m[0]?.toUpperCase())
    .join("");
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-3 px-3 py-2">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1C3A63] text-sm font-semibold">
          {initiales}
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-semibold">{prenomDe(profil)}</span>
          <span className="truncate text-xs text-[#9FB3C8]">
            {ROLES[profil.role]}
            {profil.centre_nom ? ` · ${profil.centre_nom}` : ""}
          </span>
        </span>
      </div>
      <BoutonDeconnexion />
    </div>
  );
}

type Props = {
  titre: string;
  entete?: React.ReactNode; // remplace le titre standard (ex. tableau de bord)
  sousTitre?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
};

export default function Coque({ titre, entete, sousTitre, actions, children }: Props) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <MenuLateral
        piedDePage={
          <Suspense fallback={null}>
            <Utilisateur />
          </Suspense>
        }
      />
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-8">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          {entete ?? (
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-odon-encre sm:text-[26px]">{titre}</h1>
              {sousTitre && <p className="mt-1 text-sm text-odon-gris-texte">{sousTitre}</p>}
            </div>
          )}
          <div className="impression-masquee flex flex-wrap items-center gap-3">
            {actions}
            <Suspense fallback={<FenetreNotifications alertes={[]} />}>
              <Cloche />
            </Suspense>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}

// Encadré pour les pages pas encore construites
export function BientotDisponible({ texte }: { texte: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#B8C2CC] bg-white px-6 py-12 text-center">
      <p className="text-base font-semibold text-odon-encre">Bientôt disponible</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-odon-gris-texte">{texte}</p>
    </div>
  );
}

export const classesBouton =
  "inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-odon-bleu px-4 text-sm font-semibold text-white transition hover:bg-[#002A52]";
export const classesBoutonSecondaire =
  "inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#D5DBE0] bg-white px-4 text-sm font-semibold text-odon-bleu transition hover:bg-[#E6F7FB]";

// Encadré affiché à la direction sur les pages de saisie
export function LectureSeule({ texte }: { texte: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-[#BFDDF0] bg-[#E6F7FB] px-5 py-4 text-odon-bleu">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mt-0.5 shrink-0">
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
      <p className="text-sm">
        <strong className="font-semibold">Accès en lecture seule.</strong> {texte}
      </p>
    </div>
  );
}
