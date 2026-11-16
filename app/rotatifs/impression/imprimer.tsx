"use client";

import { useEffect } from "react";

// Ouvre la fenêtre d'impression dès que l'état de stock est affiché
export default function Imprimer() {
  useEffect(() => {
    const t = setTimeout(() => window.print(), 400);
    return () => clearTimeout(t);
  }, []);
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="impression-masquee inline-flex h-11 items-center gap-2 rounded-lg bg-odon-bleu px-4 text-sm font-semibold text-white"
    >
      Imprimer
    </button>
  );
}
