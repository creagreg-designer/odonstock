"use client";

import { useState, useTransition } from "react";
import { supprimerMouvement } from "../actions";

// Suppression en deux temps : « Supprimer », puis « Confirmer » pour éviter les erreurs
export default function BoutonSupprimer({ lotId, type }: { lotId: string; type: string }) {
  const [confirmer, setConfirmer] = useState(false);
  const [erreur, setErreur] = useState("");
  const [enCours, demarrer] = useTransition();

  if (!confirmer) {
    return (
      <button
        type="button"
        onClick={() => setConfirmer(true)}
        aria-label="Supprimer ce mouvement"
        className="flex h-9 w-9 items-center justify-center rounded-lg text-odon-gris-texte hover:bg-[#FDECE3] hover:text-odon-alerte"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" />
        </svg>
      </button>
    );
  }

  return (
    <span className="inline-flex flex-wrap items-center justify-end gap-2">
      <button
        type="button"
        disabled={enCours}
        onClick={() =>
          demarrer(async () => {
            const r = await supprimerMouvement(lotId, type);
            if (!r.ok) setErreur(r.message);
          })
        }
        className="h-9 rounded-lg bg-odon-alerte px-3 text-xs font-semibold text-white disabled:opacity-50"
      >
        {enCours ? "Suppression…" : "Confirmer"}
      </button>
      <button type="button" onClick={() => setConfirmer(false)} className="h-9 px-2 text-xs font-semibold text-odon-gris-texte">
        Annuler
      </button>
      {erreur && <span role="alert" className="w-full text-right text-xs font-semibold text-[#9A3412]">{erreur}</span>}
    </span>
  );
}
