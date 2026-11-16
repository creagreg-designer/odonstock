"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import RechercheProduit from "@/components/recherche-produit";
import { formaterStock, pluriel } from "@/lib/format";
import type { ProduitStock } from "@/lib/produits";
import { bip } from "@/lib/sons";
import { enregistrerInventaire } from "../actions";

type Saisie = { achats: string; sorties: string };
type Props = { zone: string | null; produitsZone: ProduitStock[]; tousProduits: ProduitStock[] };

const champNombre =
  "h-11 w-[72px] rounded-lg border border-[#D5DBE0] bg-white px-2 text-center text-base font-semibold text-odon-encre outline-none focus:border-odon-turquoise focus:ring-2 focus:ring-odon-turquoise/30";

// Feuille de comptage : un champ vide = produit non compté (ignoré)
export default function Feuille({ zone, produitsZone, tousProduits }: Props) {
  const champ = useRef<HTMLInputElement>(null);
  const [liste, setListe] = useState(produitsZone);
  const [saisies, setSaisies] = useState<Record<string, Saisie>>({});
  const [erreur, setErreur] = useState("");
  const [enCours, demarrer] = useTransition();

  const compte = (p: ProduitStock): number | null => {
    const s = saisies[p.id];
    if (!s || (s.achats === "" && s.sorties === "")) return null;
    return (Number.parseInt(s.achats || "0", 10) || 0) * p.parAchat + (Number.parseInt(s.sorties || "0", 10) || 0);
  };

  function modifier(id: string, champ: keyof Saisie, valeur: string) {
    setSaisies((s) => ({ ...s, [id]: { ...(s[id] ?? { achats: "", sorties: "" }), [champ]: valeur.replace(/\D/g, "") } }));
  }

  // Un scan ajoute une unité d'achat au comptage du produit
  function scanner(p: ProduitStock) {
    bip();
    if (!liste.some((x) => x.id === p.id)) setListe((l) => [p, ...l]);
    setSaisies((s) => {
      const actuel = s[p.id] ?? { achats: "", sorties: "" };
      return { ...s, [p.id]: { ...actuel, achats: String((Number.parseInt(actuel.achats || "0", 10) || 0) + 1) } };
    });
    setTimeout(() => document.getElementById(`ligne-${p.id}`)?.scrollIntoView({ block: "center", behavior: "smooth" }), 50);
  }

  const comptes = liste.filter((p) => compte(p) != null);
  const ecarts = comptes.filter((p) => compte(p) !== p.stock);

  function valider() {
    setErreur("");
    demarrer(async () => {
      const r = await enregistrerInventaire(
        zone,
        comptes.map((p) => ({ produitId: p.id, compte: compte(p)! })),
      );
      if (r && !r.ok) setErreur(r.message);
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <RechercheProduit
        ref={champ}
        produits={tousProduits}
        onChoix={scanner}
        placeholder="Scanner chaque boîte, ou taper 3 lettres pour trouver un produit…"
        onInconnu={(code) => {
          bip(220, 0.3);
          setErreur(`Produit introuvable : « ${code} ».`);
        }}
      />

      <section className="rounded-xl border border-[#E3E7EB] bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EEF1F4] px-5 py-4">
          <p className="text-sm text-odon-gris-texte">
            Saisissez ce que vous voyez réellement. Laissez vide un produit non compté.
          </p>
          <div className="flex items-center gap-3 text-sm font-semibold">
            <span className="text-odon-encre">{comptes.length}/{liste.length} comptés</span>
            <span className={ecarts.length ? "text-odon-alerte" : "text-[#166534]"}>
              {ecarts.length} écart{ecarts.length > 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {liste.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-odon-gris-texte">Aucun produit dans cette zone.</p>
        ) : (
          <ul>
            {liste.map((p) => {
              const c = compte(p);
              const ecart = c == null ? null : c - p.stock;
              const s = saisies[p.id] ?? { achats: "", sorties: "" };
              return (
                <li id={`ligne-${p.id}`} key={p.id} className={`flex flex-wrap items-center justify-between gap-4 border-t border-[#EEF1F4] px-5 py-3.5 first:border-t-0 ${ecart ? "bg-[#FFF7F3]" : ""}`}>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-[15px] font-semibold text-odon-encre">{p.nom}</span>
                    <span className="text-xs text-odon-gris-texte">
                      Théorique : {formaterStock(p.stock, p.parAchat, p.uniteAchat, p.uniteSortie)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-2 text-sm text-odon-encre">
                      <input inputMode="numeric" value={s.achats} onChange={(e) => modifier(p.id, "achats", e.target.value)} placeholder="–" className={champNombre} aria-label={`${pluriel(p.uniteAchat, 2)} comptés pour ${p.nom}`} />
                      {pluriel(p.uniteAchat, 2)}
                    </label>
                    {p.parAchat > 1 && (
                      <label className="flex items-center gap-2 text-sm text-odon-encre">
                        <span className="text-odon-gris-texte">+</span>
                        <input inputMode="numeric" value={s.sorties} onChange={(e) => modifier(p.id, "sorties", e.target.value)} placeholder="–" className={champNombre} aria-label={`${pluriel(p.uniteSortie, 2)} en plus pour ${p.nom}`} />
                        {pluriel(p.uniteSortie, 2)}
                      </label>
                    )}
                    <span className={`w-28 text-right text-xs font-semibold ${ecart == null ? "text-odon-gris-texte" : ecart === 0 ? "text-[#166534]" : "text-odon-alerte"}`}>
                      {ecart == null ? "Non compté" : ecart === 0 ? "✓ Juste" : `Écart ${ecart > 0 ? "+" : "−"}${formaterStock(Math.abs(ecart), p.parAchat, p.uniteAchat, p.uniteSortie)}`}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {erreur && <p role="alert" className="rounded-xl bg-[#FDECE3] px-4 py-3 text-sm font-semibold text-[#9A3412]">{erreur}</p>}

      <div className="sticky bottom-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-odon-nuit px-5 py-4 text-white shadow-xl">
        <span className="text-sm">
          {comptes.length
            ? `${comptes.length} produit${comptes.length > 1 ? "s" : ""} compté${comptes.length > 1 ? "s" : ""} · ${ecarts.length} écart${ecarts.length > 1 ? "s" : ""} à corriger dans le stock`
            : "Aucun produit compté pour l'instant"}
        </span>
        <div className="flex gap-2">
          <Link href="/inventaire" className="inline-flex h-11 items-center rounded-lg px-4 text-sm font-semibold text-[#C9D6E5] hover:bg-white/10">
            Annuler
          </Link>
          <button
            type="button"
            onClick={valider}
            disabled={enCours || comptes.length === 0}
            className="h-11 rounded-lg bg-[#00C8E8] px-5 text-sm font-semibold text-odon-nuit hover:bg-[#4FDCF2] disabled:opacity-40"
          >
            {enCours ? "Enregistrement…" : "Valider l'inventaire"}
          </button>
        </div>
      </div>
    </div>
  );
}
