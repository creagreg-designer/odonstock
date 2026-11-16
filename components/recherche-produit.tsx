"use client";

import { forwardRef, useMemo, useState } from "react";
import type { ProduitStock } from "@/lib/produits";

type Props = {
  produits: ProduitStock[];
  onChoix: (p: ProduitStock) => void;
  onInconnu?: (code: string) => void;
  placeholder?: string;
};

function normaliser(t: string) {
  return t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

// Champ unique pour la douchette (code + Entrée) ou la recherche au clavier (3 lettres)
const RechercheProduit = forwardRef<HTMLInputElement, Props>(function RechercheProduit(
  { produits, onChoix, onInconnu, placeholder = "Scanner un produit ou taper 3 lettres…" },
  ref,
) {
  const [saisie, setSaisie] = useState("");
  const terme = normaliser(saisie);

  const suggestions = useMemo(() => {
    if (terme.length < 3) return [];
    return produits
      .filter((p) => normaliser(p.nom).includes(terme) || normaliser(p.reference ?? "").includes(terme))
      .slice(0, 8);
  }, [produits, terme]);

  function choisir(p: ProduitStock) {
    onChoix(p);
    setSaisie("");
  }

  function valider(e: React.FormEvent) {
    e.preventDefault();
    if (!terme) return;
    // Un scan donne la référence ou l'identifiant exact du produit
    const exact = produits.find((p) => p.id === saisie.trim() || normaliser(p.reference ?? "") === terme);
    if (exact) return choisir(exact);
    if (suggestions.length === 1) return choisir(suggestions[0]);
    if (suggestions.length === 0) {
      onInconnu?.(saisie.trim());
      setSaisie("");
    }
  }

  return (
    <form onSubmit={valider} className="relative">
      <label className="flex h-14 items-center gap-3 rounded-xl border-2 border-odon-turquoise bg-white px-4 focus-within:ring-4 focus-within:ring-odon-turquoise/20">
        <svg width="26" height="26" viewBox="0 0 40 40" aria-hidden="true" className="shrink-0">
          <g fill="none" stroke="#00A6C6" strokeWidth="3.5" strokeLinecap="round">
            <path d="M4 12V9a5 5 0 0 1 5-5h3M28 4h3a5 5 0 0 1 5 5v3M36 28v3a5 5 0 0 1-5 5h-3M12 36H9a5 5 0 0 1-5-5v-3" />
          </g>
          <path d="M10 20h20" stroke="#00386D" strokeWidth="3" strokeLinecap="round" />
        </svg>
        <span className="sr-only">Produit</span>
        <input
          ref={ref}
          value={saisie}
          onChange={(e) => setSaisie(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          autoFocus
          className="min-w-0 flex-1 bg-transparent text-base text-odon-encre outline-none placeholder:text-odon-gris-texte"
        />
      </label>
      {suggestions.length > 0 && (
        <ul className="absolute left-0 right-0 top-[60px] z-20 overflow-hidden rounded-xl border border-[#E3E7EB] bg-white shadow-xl">
          {suggestions.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => choisir(p)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-[#E6F7FB]"
              >
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-semibold text-odon-encre">{p.nom}</span>
                  <span className="text-xs text-odon-gris-texte">{p.reference ? `Réf. ${p.reference}` : "Sans référence"}</span>
                </span>
                <span className="shrink-0 text-xs font-semibold text-odon-bleu">Ajouter</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
});

export default RechercheProduit;
