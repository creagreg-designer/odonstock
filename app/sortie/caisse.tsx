"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import RechercheProduit from "@/components/recherche-produit";
import { formaterStock, pluriel } from "@/lib/format";
import type { ProduitStock } from "@/lib/produits";
import { bip } from "@/lib/sons";
import { enregistrerSortie } from "./actions";

type Props = { produits: ProduitStock[]; lieux: { id: string; nom: string }[] };

const DELAI_RAPPEL = 2 * 60 * 1000; // 2 minutes sans choix de cabinet

export default function Caisse({ produits, lieux }: Props) {
  const champ = useRef<HTMLInputElement>(null);
  const [panier, setPanier] = useState<{ id: string; quantite: number }[]>([]);
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);
  const [rappel, setRappel] = useState(false);
  const [enCours, demarrer] = useTransition();
  const parId = new Map(produits.map((p) => [p.id, p]));

  // Rappel sonore si le panier reste sans cabinet pendant 2 minutes
  useEffect(() => {
    if (!panier.length) return;
    const t = setTimeout(() => {
      setRappel(true);
      bip(520, 0.25);
      setTimeout(() => bip(520, 0.25), 350);
    }, DELAI_RAPPEL);
    return () => clearTimeout(t);
  }, [panier]);

  useEffect(() => {
    if (!message?.ok) return;
    const t = setTimeout(() => setMessage(null), 5000);
    return () => clearTimeout(t);
  }, [message]);

  function ajouter(p: ProduitStock, quantite = 1) {
    bip();
    setMessage(null);
    setRappel(false);
    setPanier((actuel) => {
      const existe = actuel.find((l) => l.id === p.id);
      if (existe) return actuel.map((l) => (l.id === p.id ? { ...l, quantite: l.quantite + quantite } : l));
      return [{ id: p.id, quantite }, ...actuel];
    });
  }

  function changer(id: string, ecart: number) {
    setRappel(false);
    setPanier((actuel) =>
      actuel.map((l) => (l.id === id ? { ...l, quantite: l.quantite + ecart } : l)).filter((l) => l.quantite > 0),
    );
  }

  function valider(lieu: { id: string; nom: string }) {
    demarrer(async () => {
      const r = await enregistrerSortie(lieu.id, panier.map((l) => ({ produitId: l.id, quantite: l.quantite })));
      if (r.ok) {
        const nb = panier.reduce((n, l) => n + l.quantite, 0);
        setMessage({ ok: true, texte: `Sortie enregistrée vers ${lieu.nom} : ${panier.length} produit${panier.length > 1 ? "s" : ""}, ${nb} unité${nb > 1 ? "s" : ""}.` });
        setPanier([]);
        setRappel(false);
        champ.current?.focus();
      } else {
        setMessage({ ok: false, texte: r.message });
      }
    });
  }

  const libelle = (p: ProduitStock, q: number) =>
    `${q} ${pluriel(p.uniteSortie, q)}` + (p.contenu && p.uniteContenu ? ` de ${p.contenu} ${pluriel(p.uniteContenu, p.contenu)}` : "");

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
      <div className="flex flex-col gap-5">
        <RechercheProduit
          ref={champ}
          produits={produits}
          onChoix={(p) => ajouter(p)}
          onInconnu={(code) => {
            bip(220, 0.3);
            setMessage({ ok: false, texte: `Produit introuvable : « ${code} ». Vérifiez l'étiquette ou cherchez par le nom.` });
          }}
        />

        <section className="rounded-xl border border-[#E3E7EB] bg-white p-5">
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <h2 className="text-base font-semibold text-odon-encre">Panier</h2>
            {panier.length > 0 && (
              <button type="button" onClick={() => { setPanier([]); setRappel(false); }} className="text-sm font-semibold text-odon-gris-texte hover:text-odon-encre">
                Vider
              </button>
            )}
          </div>
          {panier.length === 0 ? (
            <p className="py-8 text-center text-sm text-odon-gris-texte">
              Scannez les produits à sortir, ou tapez les premières lettres de leur nom.
            </p>
          ) : (
            panier.map((l) => {
              const p = parId.get(l.id);
              if (!p) return null;
              const reste = p.stock - l.quantite;
              return (
                <div key={l.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-[#EEF1F4] py-3.5 first:border-t-0">
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-[15px] font-semibold text-odon-encre">{p.nom}</span>
                    <span className="text-sm text-odon-bleu">{libelle(p, l.quantite)}</span>
                    <span className={`text-xs ${reste < 0 ? "font-semibold text-odon-alerte" : "text-odon-gris-texte"}`}>
                      {reste < 0
                        ? "Stock insuffisant d'après l'outil : pensez à vérifier l'inventaire"
                        : `Restera ${formaterStock(reste, p.parAchat, p.uniteAchat, p.uniteSortie)}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.parAchat > 1 && (
                      <button type="button" onClick={() => ajouter(p, p.parAchat)} className="h-11 rounded-lg bg-[#E6F7FB] px-3 text-xs font-semibold text-odon-bleu hover:bg-[#d3f0f7]">
                        + 1 {p.uniteAchat}
                      </button>
                    )}
                    <button type="button" onClick={() => changer(l.id, -1)} aria-label="Un de moins" className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#D5DBE0] text-xl font-semibold text-odon-bleu hover:bg-[#E6F7FB]">−</button>
                    <span className="w-8 text-center text-lg font-bold text-odon-encre" aria-live="polite">{l.quantite}</span>
                    <button type="button" onClick={() => changer(l.id, 1)} aria-label="Un de plus" className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#D5DBE0] text-xl font-semibold text-odon-bleu hover:bg-[#E6F7FB]">+</button>
                  </div>
                </div>
              );
            })
          )}
        </section>
      </div>

      <section className="flex flex-col gap-4 rounded-xl border border-[#E3E7EB] bg-white p-5">
        <div>
          <h2 className="text-base font-semibold text-odon-encre">Pour quel cabinet ?</h2>
          <p className="mt-0.5 text-sm text-odon-gris-texte">Toucher le cabinet valide la sortie</p>
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {lieux.map((l) => (
            <button
              key={l.id}
              type="button"
              disabled={!panier.length || enCours}
              onClick={() => valider(l)}
              className="min-h-[64px] rounded-xl border-2 border-[#D5DBE0] bg-white px-2 text-[15px] font-semibold text-odon-bleu transition hover:border-odon-turquoise hover:bg-[#E6F7FB] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {l.nom}
            </button>
          ))}
        </div>
        {rappel && (
          <p role="alert" className="rounded-lg bg-[#FEF3C7] px-3 py-2.5 text-sm font-semibold text-[#854D0E]">
            Le panier attend depuis 2 minutes : touchez le cabinet pour valider la sortie.
          </p>
        )}
        {message && (
          <p role="status" className={`rounded-lg px-3 py-2.5 text-sm font-semibold ${message.ok ? "bg-[#E3F4EA] text-[#166534]" : "bg-[#FDECE3] text-[#9A3412]"}`}>
            {message.ok ? "✓ " : ""}{message.texte}
          </p>
        )}
      </section>
    </div>
  );
}
