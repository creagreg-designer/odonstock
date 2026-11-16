"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export type Alerte = {
  id: string;
  type: "rupture" | "faible";
  produit: string;
  detail: string;
};

const FILTRES = [
  { valeur: "toutes", label: "Toutes" },
  { valeur: "rupture", label: "Ruptures" },
  { valeur: "faible", label: "Quantités faibles" },
] as const;

export default function FenetreNotifications({ alertes }: { alertes: Alerte[] }) {
  const [ouverte, setOuverte] = useState(false);
  const [filtre, setFiltre] = useState<(typeof FILTRES)[number]["valeur"]>("toutes");
  const zone = useRef<HTMLDivElement>(null);

  // Fermeture au clic à l'extérieur et avec la touche Échap
  useEffect(() => {
    if (!ouverte) return;
    const clic = (e: MouseEvent) => {
      if (zone.current && !zone.current.contains(e.target as Node)) setOuverte(false);
    };
    const touche = (e: KeyboardEvent) => e.key === "Escape" && setOuverte(false);
    document.addEventListener("mousedown", clic);
    document.addEventListener("keydown", touche);
    return () => {
      document.removeEventListener("mousedown", clic);
      document.removeEventListener("keydown", touche);
    };
  }, [ouverte]);

  const visibles = filtre === "toutes" ? alertes : alertes.filter((a) => a.type === filtre);
  const nb = alertes.length;

  return (
    <div ref={zone} className="relative">
      <button
        type="button"
        onClick={() => setOuverte((o) => !o)}
        aria-expanded={ouverte}
        aria-haspopup="dialog"
        aria-label={nb ? `Notifications : ${nb} alerte${nb > 1 ? "s" : ""}` : "Notifications"}
        className="relative flex h-11 w-11 items-center justify-center rounded-lg border border-[#D5DBE0] bg-white text-odon-bleu hover:bg-[#E6F7FB]"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        {nb > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-odon-gris bg-odon-alerte px-1 text-[11px] font-bold text-white">
            {nb > 99 ? "99+" : nb}
          </span>
        )}
      </button>

      {ouverte && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 top-[52px] z-50 flex max-h-[70vh] w-[min(92vw,400px)] flex-col overflow-hidden rounded-2xl border border-[#E3E7EB] bg-white shadow-2xl shadow-[#0A2346]/20"
        >
          <div className="flex items-center justify-between gap-3 border-b border-[#EEF1F4] px-5 py-4">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-odon-encre">Notifications</h2>
              {nb > 0 && (
                <span className="rounded-full bg-odon-alerte px-2 py-0.5 text-xs font-bold text-white">{nb}</span>
              )}
            </div>
            <button type="button" onClick={() => setOuverte(false)} aria-label="Fermer" className="flex h-9 w-9 items-center justify-center rounded-lg text-odon-gris-texte hover:bg-odon-gris">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>

          <div className="flex gap-2 px-5 pt-3">
            {FILTRES.map((f) => (
              <button
                key={f.valeur}
                type="button"
                onClick={() => setFiltre(f.valeur)}
                aria-pressed={filtre === f.valeur}
                className={`h-8 rounded-full px-3 text-xs font-semibold transition ${
                  filtre === f.valeur ? "bg-odon-bleu text-white" : "border border-[#D5DBE0] text-[#33404B] hover:bg-[#E6F7FB]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-2">
            {visibles.length === 0 ? (
              <div className="px-3 py-10 text-center">
                <p className="text-sm font-semibold text-odon-encre">Aucune alerte</p>
                <p className="mt-1 text-xs text-odon-gris-texte">
                  {filtre === "toutes" ? "Tous les produits suivis sont au-dessus de leur seuil." : "Rien dans cette catégorie d'alertes."}
                </p>
              </div>
            ) : (
              visibles.map((a) => {
                const rupture = a.type === "rupture";
                return (
                  <Link
                    key={a.id}
                    href={`/catalogue?q=${encodeURIComponent(a.produit)}`}
                    onClick={() => setOuverte(false)}
                    className={`flex items-start gap-3 rounded-xl px-3 py-3 hover:bg-odon-gris ${rupture ? "bg-[#FFF7F3]" : ""}`}
                  >
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${rupture ? "bg-[#FDECE3] text-odon-alerte" : "bg-[#FEF3C7] text-[#A16207]"}`}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d={rupture ? "M12 3l10 18H2L12 3zM12 10v4M12 17h.01" : "M21 8l-9-5-9 5v8l9 5 9-5V8zM12 13v8M3 8l9 5 9-5"} />
                      </svg>
                    </span>
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className={`text-xs font-semibold ${rupture ? "text-[#9A3412]" : "text-[#854D0E]"}`}>
                        {rupture ? "Rupture" : "Quantité faible"}
                      </span>
                      <span className="text-sm font-semibold text-odon-encre">{a.produit}</span>
                      <span className="text-xs text-odon-gris-texte">{a.detail}</span>
                    </span>
                  </Link>
                );
              })
            )}
          </div>

          <div className="border-t border-[#EEF1F4] px-5 py-3">
            <Link href="/parametres" onClick={() => setOuverte(false)} className="text-sm font-semibold text-odon-bleu hover:underline">
              Régler les notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
