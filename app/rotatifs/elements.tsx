"use client";

import { useState, useTransition } from "react";
import { changerStatut, definirObjectif, majReparation } from "./actions";
import { LISTE_STATUTS, STATUTS, type Statut } from "@/lib/rotatifs";

// Statut modifiable directement dans la liste
export function SelectStatut({ id, statut, modifiable }: { id: string; statut: Statut; modifiable: boolean }) {
  const [valeur, setValeur] = useState(statut);
  const [erreur, setErreur] = useState("");
  const [enCours, demarrer] = useTransition();

  if (!modifiable) {
    return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUTS[statut].classes}`}>{STATUTS[statut].label}</span>;
  }
  return (
    <span className="inline-flex flex-col items-end gap-1">
      <span className={`relative inline-flex items-center rounded-full ring-1 ring-black/5 ${STATUTS[valeur].classes}`}>
        <select
          value={valeur}
          disabled={enCours}
          aria-label="Statut du rotatif"
          onChange={(e) => {
            const nouveau = e.target.value as Statut;
            const ancien = valeur;
            setValeur(nouveau);
            demarrer(async () => {
              const r = await changerStatut(id, nouveau);
              if (!r.ok) {
                setValeur(ancien);
                setErreur(r.message);
              }
            });
          }}
          className="sans-fleche h-9 cursor-pointer appearance-none rounded-full border-0 bg-transparent pl-4 pr-10 text-xs font-semibold text-inherit outline-none focus-visible:ring-2 focus-visible:ring-odon-turquoise"
        >
          {LISTE_STATUTS.map((s) => <option key={s} value={s}>{STATUTS[s].label}</option>)}
        </select>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="pointer-events-none absolute right-4">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </span>
      {erreur && <span role="alert" className="text-xs font-semibold text-[#9A3412]">{erreur}</span>}
    </span>
  );
}

// Objectif par type, modifiable en un clic
export function Objectif({ typeId, objectif, modifiable }: { typeId: string; objectif: number | null; modifiable: boolean }) {
  const [edition, setEdition] = useState(false);
  const [valeur, setValeur] = useState(String(objectif ?? ""));
  const [enCours, demarrer] = useTransition();

  if (!edition) {
    return (
      <button
        type="button"
        disabled={!modifiable}
        onClick={() => setEdition(true)}
        className="text-xs font-semibold text-odon-bleu underline-offset-2 hover:underline disabled:cursor-default disabled:text-odon-gris-texte disabled:no-underline"
      >
        {objectif == null ? "Définir l'objectif" : `Objectif : ${objectif}`}
      </button>
    );
  }
  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        demarrer(async () => {
          const r = await definirObjectif(typeId, Number.parseInt(valeur, 10));
          if (r.ok) setEdition(false);
        });
      }}
    >
      <input
        type="number"
        min={0}
        autoFocus
        value={valeur}
        onChange={(e) => setValeur(e.target.value)}
        aria-label="Nombre de rotatifs nécessaires"
        className="h-9 w-20 rounded-lg border border-[#D5DBE0] px-2 text-sm"
      />
      <button type="submit" disabled={enCours} className="h-9 rounded-lg bg-odon-bleu px-3 text-xs font-semibold text-white disabled:opacity-50">OK</button>
      <button type="button" onClick={() => setEdition(false)} className="h-9 px-1 text-xs font-semibold text-odon-gris-texte">Annuler</button>
    </form>
  );
}

// Réparateur et coût d'une réparation en cours
export function DetailsReparation({ id, reparateur, cout }: { id: string; reparateur: string | null; cout: number | null }) {
  const [edition, setEdition] = useState(false);
  const [rep, setRep] = useState(reparateur ?? "");
  const [prix, setPrix] = useState(cout == null ? "" : String(cout).replace(".", ","));
  const [enCours, demarrer] = useTransition();

  if (!edition) {
    return (
      <button type="button" onClick={() => setEdition(true)} className="text-left text-xs font-semibold text-odon-bleu hover:underline">
        {reparateur || cout != null
          ? `${reparateur ?? "Réparateur ?"} · ${cout != null ? `${String(cout).replace(".", ",")} €` : "coût ?"}`
          : "Ajouter le réparateur et le coût"}
      </button>
    );
  }
  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        demarrer(async () => {
          const r = await majReparation(id, { reparateur: rep, cout: prix });
          if (r.ok) setEdition(false);
        });
      }}
    >
      <input value={rep} onChange={(e) => setRep(e.target.value)} placeholder="Réparateur" aria-label="Réparateur" className="h-9 w-36 rounded-lg border border-[#D5DBE0] px-2 text-sm" />
      <input value={prix} onChange={(e) => setPrix(e.target.value)} inputMode="decimal" placeholder="Coût €" aria-label="Coût en euros" className="h-9 w-24 rounded-lg border border-[#D5DBE0] px-2 text-sm" />
      <button type="submit" disabled={enCours} className="h-9 rounded-lg bg-odon-bleu px-3 text-xs font-semibold text-white disabled:opacity-50">OK</button>
      <button type="button" onClick={() => setEdition(false)} className="h-9 px-1 text-xs font-semibold text-odon-gris-texte">Annuler</button>
    </form>
  );
}
