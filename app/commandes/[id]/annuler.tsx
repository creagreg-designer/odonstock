"use client";

import { useState, useTransition } from "react";
import { annulerCommande } from "../actions";

export default function BoutonAnnuler({ id }: { id: string }) {
  const [confirmer, setConfirmer] = useState(false);
  const [erreur, setErreur] = useState("");
  const [enCours, demarrer] = useTransition();
  if (!confirmer) {
    return (
      <button type="button" onClick={() => setConfirmer(true)} className="inline-flex h-11 items-center rounded-lg border border-[#F0C3AE] bg-white px-4 text-sm font-semibold text-[#9A3412] hover:bg-[#FFF7F3]">
        Annuler la commande
      </button>
    );
  }
  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        disabled={enCours}
        onClick={() => demarrer(async () => { const r = await annulerCommande(id); if (!r.ok) setErreur(r.message); })}
        className="h-11 rounded-lg bg-odon-alerte px-4 text-sm font-semibold text-white disabled:opacity-50"
      >
        Confirmer l&apos;annulation
      </button>
      <button type="button" onClick={() => setConfirmer(false)} className="h-11 px-2 text-sm font-semibold text-odon-gris-texte">Non</button>
      {erreur && <span role="alert" className="text-xs text-[#9A3412]">{erreur}</span>}
    </span>
  );
}
