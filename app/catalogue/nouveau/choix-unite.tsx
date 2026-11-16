"use client";

import { useState } from "react";

// Liste des conditionnements, avec « Autre… » pour en saisir un nouveau.
export const UNITES = [
  "boîte", "blister", "bidon", "bouteille", "carton", "cartouche", "coffret", "flacon",
  "kit", "lot", "paquet", "plaquette", "pot", "rouleau", "sachet", "seringue", "spray", "tube", "unité",
];

type Props = { name: string; defaut?: string; className: string; onChange?: (valeur: string) => void };

export default function ChoixUnite({ name, defaut = "boîte", className, onChange }: Props) {
  const [valeur, setValeur] = useState(defaut);
  const autre = valeur === "__autre__";

  return (
    <>
      <select
        name={autre ? undefined : name}
        value={valeur}
        onChange={(e) => {
          setValeur(e.target.value);
          if (e.target.value !== "__autre__") onChange?.(e.target.value);
        }}
        className={className}
      >
        {UNITES.map((u) => (
          <option key={u} value={u}>{u}</option>
        ))}
        <option value="__autre__">Autre…</option>
      </select>
      {autre && (
        <input
          name={name}
          required
          autoFocus
          placeholder="Saisir le conditionnement"
          aria-label="Autre conditionnement"
          onChange={(e) => onChange?.(e.target.value.trim().toLowerCase() || "…")}
          className={className}
        />
      )}
    </>
  );
}
