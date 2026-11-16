"use client";

import { useState, useTransition } from "react";
import { pluriel } from "@/lib/format";
import { definirSeuil } from "./actions";

type Props = { produitId: string; seuil: number | null; parAchat: number; uniteAchat: string; modifiable: boolean };

// Seuil affiché et saisi en unités d'achat (ex. « 3 boîtes »)
export default function Seuil({ produitId, seuil, parAchat, uniteAchat, modifiable }: Props) {
  const enAchats = seuil == null ? null : Math.ceil(seuil / Math.max(1, parAchat));
  const [edition, setEdition] = useState(false);
  const [valeur, setValeur] = useState(enAchats == null ? "" : String(enAchats));
  const [erreur, setErreur] = useState("");
  const [enCours, demarrer] = useTransition();

  const texte = enAchats == null ? "Non défini" : `${enAchats} ${pluriel(uniteAchat, enAchats)}`;

  if (!edition) {
    return modifiable ? (
      <button type="button" onClick={() => setEdition(true)} className={`text-sm hover:underline ${enAchats == null ? "text-odon-gris-texte" : "font-medium text-odon-encre"}`}>
        {texte}
      </button>
    ) : (
      <span className="text-sm text-odon-encre">{texte}</span>
    );
  }

  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        demarrer(async () => {
          const n = valeur.trim() === "" ? null : Number.parseInt(valeur, 10);
          const r = await definirSeuil(produitId, n, parAchat);
          if (r.ok) setEdition(false);
          else setErreur(r.message);
        });
      }}
    >
      <input
        inputMode="numeric"
        autoFocus
        value={valeur}
        onChange={(e) => setValeur(e.target.value.replace(/\D/g, ""))}
        aria-label={`Seuil en ${pluriel(uniteAchat, 2)}`}
        className="h-9 w-16 rounded-lg border border-[#D5DBE0] px-2 text-center text-sm"
      />
      <span className="text-xs text-odon-gris-texte">{pluriel(uniteAchat, 2)}</span>
      <button type="submit" disabled={enCours} className="h-9 rounded-lg bg-odon-bleu px-3 text-xs font-semibold text-white disabled:opacity-50">OK</button>
      <button type="button" onClick={() => setEdition(false)} className="h-9 px-1 text-xs font-semibold text-odon-gris-texte">✕</button>
      {erreur && <span role="alert" className="text-xs text-[#9A3412]">{erreur}</span>}
    </form>
  );
}
