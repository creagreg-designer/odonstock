"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import RechercheProduit from "@/components/recherche-produit";
import { formaterStock, pluriel } from "@/lib/format";
import type { ProduitStock } from "@/lib/produits";
import { bip } from "@/lib/sons";
import { enregistrerReception } from "./actions";

type Ligne = { id: string; achats: number; sorties: number };

const champNombre =
  "h-11 w-20 rounded-lg border border-[#D5DBE0] bg-white px-2 text-center text-base font-semibold text-odon-encre outline-none focus:border-odon-turquoise focus:ring-2 focus:ring-odon-turquoise/30";

type Props = { produits: ProduitStock[]; initiales?: { id: string; achats: number }[]; commandeId?: string | null };

export default function SaisieReception({ produits, initiales = [], commandeId = null }: Props) {
  const champ = useRef<HTMLInputElement>(null);
  const [lignes, setLignes] = useState<Ligne[]>(() => initiales.map((l) => ({ id: l.id, achats: l.achats, sorties: 0 })));
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);
  const [enCours, demarrer] = useTransition();
  const parId = new Map(produits.map((p) => [p.id, p]));

  useEffect(() => {
    if (!message?.ok) return;
    const t = setTimeout(() => setMessage(null), 5000);
    return () => clearTimeout(t);
  }, [message]);

  // Chaque scan ajoute une unité d'achat (une boîte)
  function ajouter(p: ProduitStock) {
    bip();
    setMessage(null);
    setLignes((actuel) => {
      const existe = actuel.find((l) => l.id === p.id);
      if (existe) return actuel.map((l) => (l.id === p.id ? { ...l, achats: l.achats + 1 } : l));
      return [{ id: p.id, achats: 1, sorties: 0 }, ...actuel];
    });
  }

  function modifier(id: string, champ: "achats" | "sorties", valeur: string) {
    const n = Math.max(0, Number.parseInt(valeur || "0", 10) || 0);
    setLignes((actuel) => actuel.map((l) => (l.id === id ? { ...l, [champ]: n } : l)));
  }

  const total = (l: Ligne) => {
    const p = parId.get(l.id);
    return p ? l.achats * p.parAchat + l.sorties : 0;
  };

  function valider() {
    demarrer(async () => {
      const r = await enregistrerReception(
        lignes.map((l) => ({ produitId: l.id, quantite: total(l), achats: l.achats })),
        note,
        commandeId,
      );
      if (r.ok) {
        setMessage({
          ok: true,
          texte: `Réception enregistrée : ${lignes.filter((l) => total(l) > 0).length} produit(s) entré(s) en stock${commandeId ? ", commande pointée" : ""}.`,
        });
        setLignes([]);
        setNote("");
        champ.current?.focus();
      } else {
        setMessage({ ok: false, texte: r.message });
      }
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <RechercheProduit
        ref={champ}
        produits={produits}
        onChoix={ajouter}
        placeholder="Scanner une étiquette ou taper 3 lettres du produit reçu…"
        onInconnu={(code) => {
          bip(220, 0.3);
          setMessage({ ok: false, texte: `Produit introuvable : « ${code} ». Ajoutez-le d'abord au catalogue.` });
        }}
      />

      <section className="rounded-xl border border-[#E3E7EB] bg-white p-5">
        <h2 className="mb-1 text-base font-semibold text-odon-encre">Produits reçus</h2>
        <p className="mb-2 text-sm text-odon-gris-texte">Chaque scan compte une unité d&apos;achat ; corrigez les quantités si besoin.</p>
        {lignes.length === 0 ? (
          <p className="py-8 text-center text-sm text-odon-gris-texte">Aucun produit pour l&apos;instant.</p>
        ) : (
          lignes.map((l) => {
            const p = parId.get(l.id);
            if (!p) return null;
            const t = total(l);
            return (
              <div key={l.id} className="flex flex-wrap items-center justify-between gap-4 border-t border-[#EEF1F4] py-4 first:border-t-0">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-[15px] font-semibold text-odon-encre">{p.nom}</span>
                  <span className="text-xs text-odon-gris-texte">
                    En stock : {formaterStock(p.stock, p.parAchat, p.uniteAchat, p.uniteSortie)} · après réception :{" "}
                    <strong className="text-odon-bleu">{formaterStock(p.stock + t, p.parAchat, p.uniteAchat, p.uniteSortie)}</strong>
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-sm text-odon-encre">
                    <input type="number" min={0} value={l.achats} onChange={(e) => modifier(l.id, "achats", e.target.value)} className={champNombre} aria-label={`Nombre de ${p.uniteAchat}s reçus`} />
                    {pluriel(p.uniteAchat, l.achats)}
                  </label>
                  {p.parAchat > 1 && (
                    <label className="flex items-center gap-2 text-sm text-odon-encre">
                      <span className="text-odon-gris-texte">+</span>
                      <input type="number" min={0} value={l.sorties} onChange={(e) => modifier(l.id, "sorties", e.target.value)} className={champNombre} aria-label={`Nombre de ${p.uniteSortie}s en plus`} />
                      {pluriel(p.uniteSortie, l.sorties)}
                    </label>
                  )}
                  <button
                    type="button"
                    onClick={() => setLignes((a) => a.filter((x) => x.id !== l.id))}
                    aria-label={`Retirer ${p.nom}`}
                    className="flex h-10 w-10 items-center justify-center rounded-lg text-odon-gris-texte hover:bg-[#FDECE3] hover:text-odon-alerte"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
                  </button>
                </div>
              </div>
            );
          })
        )}

        {lignes.length > 0 && (
          <div className="mt-2 flex flex-wrap items-end justify-between gap-4 border-t border-[#EEF1F4] pt-4">
            <label className="flex min-w-64 flex-1 flex-col gap-1.5 text-sm font-semibold text-odon-encre">
              Note <span className="font-normal text-odon-gris-texte">(facultatif : fournisseur, n° de bon de livraison…)</span>
              <input value={note} onChange={(e) => setNote(e.target.value)} className="h-11 rounded-lg border border-[#D5DBE0] px-3 text-sm outline-none focus:border-odon-turquoise" />
            </label>
            <button
              type="button"
              onClick={valider}
              disabled={enCours || lignes.every((l) => total(l) === 0)}
              className="h-11 rounded-lg bg-odon-bleu px-5 text-sm font-semibold text-white hover:bg-[#002A52] disabled:opacity-50"
            >
              {enCours ? "Enregistrement…" : "Valider la réception"}
            </button>
          </div>
        )}
      </section>

      {message && (
        <p role="status" className={`rounded-xl px-4 py-3 text-sm font-semibold ${message.ok ? "bg-[#E3F4EA] text-[#166534]" : "bg-[#FDECE3] text-[#9A3412]"}`}>
          {message.ok ? "✓ " : ""}{message.texte}
        </p>
      )}
    </div>
  );
}
