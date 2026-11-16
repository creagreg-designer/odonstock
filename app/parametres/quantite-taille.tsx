"use client";

import { useState, useTransition } from "react";
import { quantiteTaille } from "./actions";

// Quantité totale d'une taille de scan post (à ajuster après un achat)
export default function QuantiteTaille({ id, nom, quantite, modifiable }: { id: string; nom: string; quantite: number; modifiable: boolean }) {
  const [valeur, setValeur] = useState(String(quantite));
  const [etat, setEtat] = useState<"" | "ok" | "erreur">("");
  const [enCours, demarrer] = useTransition();
  const change = valeur !== String(quantite);

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 border-t border-[#EEF1F4] px-5 py-3 first:border-t-0">
      <span className="font-medium text-odon-encre">{nom}</span>
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          demarrer(async () => {
            const r = await quantiteTaille(id, Number.parseInt(valeur || "0", 10));
            setEtat(r.ok ? "ok" : "erreur");
          });
        }}
      >
        <input
          inputMode="numeric"
          disabled={!modifiable}
          value={valeur}
          onChange={(e) => { setValeur(e.target.value.replace(/\D/g, "")); setEtat(""); }}
          aria-label={`Quantité totale de ${nom}`}
          className="h-10 w-20 rounded-lg border border-[#D5DBE0] px-2 text-center text-sm font-semibold disabled:bg-odon-gris"
        />
        <span className="text-sm text-odon-gris-texte">au total</span>
        {modifiable && change && (
          <button type="submit" disabled={enCours} className="h-10 rounded-lg bg-odon-bleu px-3 text-xs font-semibold text-white disabled:opacity-50">OK</button>
        )}
        {etat === "ok" && !change && <span className="text-xs font-semibold text-[#166534]">✓</span>}
        {etat === "erreur" && <span role="alert" className="text-xs font-semibold text-[#9A3412]">Erreur</span>}
      </form>
    </li>
  );
}
