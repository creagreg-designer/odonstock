"use client";

import { useMemo, useState, useTransition } from "react";
import { formaterPrix, formaterStock, pluriel } from "@/lib/format";
import type { Proposition, TypeCommande } from "@/lib/commandes";
import { validerCommande } from "./actions";

type Article = { id: string; nom: string; reference: string | null; uniteAchat: string; prix: number | null; fournisseur: string };
type Ligne = { cle: string; produitId: string; nom: string; fournisseur: string; uniteAchat: string; prix: number | null; quantite: number; proposee: number | null; detail: string; pourquoi: string; ponctuel: boolean; note: string };

type Props = { type: TypeCommande; propositions: Proposition[]; catalogue: Article[]; voitValeurs: boolean; modifiable: boolean };

const champNombre = "h-10 w-16 rounded-lg border border-[#D5DBE0] bg-white px-2 text-center text-sm font-semibold text-odon-encre";

export default function EditeurCommande({ type, propositions, catalogue, voitValeurs, modifiable }: Props) {
  const [lignes, setLignes] = useState<Ligne[]>(() =>
    propositions.map((p) => ({
      cle: p.produitId,
      produitId: p.produitId,
      nom: p.nom,
      fournisseur: p.fournisseur,
      uniteAchat: p.uniteAchat,
      prix: p.prix,
      quantite: p.quantite,
      proposee: p.quantite,
      detail: `Stock : ${formaterStock(p.stock, p.parAchat, p.uniteAchat, p.uniteSortie)}`,
      pourquoi: p.pourquoi,
      ponctuel: false,
      note: "",
    })),
  );
  const [ajout, setAjout] = useState(false);
  const [recherche, setRecherche] = useState("");
  const [choix, setChoix] = useState<Article | null>(null);
  const [qte, setQte] = useState("1");
  const [note, setNote] = useState("");
  const [erreur, setErreur] = useState("");
  const [enCours, demarrer] = useTransition();

  const groupes = useMemo(() => {
    const m = new Map<string, Ligne[]>();
    for (const l of lignes) m.set(l.fournisseur, [...(m.get(l.fournisseur) ?? []), l]);
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b, "fr"));
  }, [lignes]);

  const montant = (ls: Ligne[]) => ls.reduce((n, l) => n + (l.prix ?? 0) * l.quantite, 0);
  const actives = lignes.filter((l) => l.quantite > 0);
  const suggestions = recherche.trim().length >= 3
    ? catalogue.filter((a) => `${a.nom} ${a.reference ?? ""}`.toLowerCase().includes(recherche.trim().toLowerCase())).slice(0, 6)
    : [];

  function changer(cle: string, valeur: string) {
    const n = Math.max(0, Number.parseInt(valeur.replace(/\D/g, "") || "0", 10));
    setLignes((ls) => ls.map((l) => (l.cle === cle ? { ...l, quantite: n } : l)));
  }

  function ajouterPonctuel() {
    if (!choix) return;
    const n = Math.max(1, Number.parseInt(qte || "1", 10) || 1);
    setLignes((ls) => [
      ...ls,
      {
        cle: `ponctuel-${choix.id}-${ls.length}`,
        produitId: choix.id,
        nom: choix.nom,
        fournisseur: choix.fournisseur,
        uniteAchat: choix.uniteAchat,
        prix: choix.prix,
        quantite: n,
        proposee: null,
        detail: "Hors consommation et seuils",
        pourquoi: note.trim() || "Demande particulière",
        ponctuel: true,
        note: note.trim(),
      },
    ]);
    setAjout(false);
    setChoix(null);
    setRecherche("");
    setQte("1");
    setNote("");
  }

  function valider() {
    setErreur("");
    demarrer(async () => {
      const r = await validerCommande(
        type,
        actives.map((l) => ({ produitId: l.produitId, quantite: l.quantite, quantiteProposee: l.proposee, prix: l.prix, ponctuel: l.ponctuel, note: l.note })),
      );
      if (r && !r.ok) setErreur(r.message);
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {lignes.length === 0 && (
        <div className="rounded-xl border border-[#E3E7EB] bg-white px-6 py-10 text-center">
          <p className="font-semibold text-odon-encre">Aucun produit à commander pour l&apos;instant.</p>
          <p className="mx-auto mt-1 max-w-lg text-sm text-odon-gris-texte">
            Les propositions s&apos;appuient sur les sorties des 8 dernières semaines et sur les seuils d&apos;alerte. Réglez des seuils dans « État du stock » ou ajoutez un produit ponctuel.
          </p>
        </div>
      )}

      {groupes.map(([fournisseur, ls]) => (
        <section key={fournisseur} className="rounded-xl border border-[#E3E7EB] bg-white">
          <div className="flex items-baseline justify-between gap-3 border-b border-[#EEF1F4] px-5 py-3.5">
            <h2 className="text-base font-semibold text-odon-encre">{fournisseur}</h2>
            <span className="text-sm text-odon-gris-texte">
              {ls.filter((l) => l.quantite > 0).length} produit{ls.length > 1 ? "s" : ""}
              {voitValeurs ? ` · ${formaterPrix(montant(ls))}` : ""}
            </span>
          </div>
          <ul>
            {ls.map((l) => (
              <li key={l.cle} className={`flex flex-wrap items-center justify-between gap-4 border-t border-[#EEF1F4] px-5 py-3 first:border-t-0 ${l.quantite === 0 ? "opacity-50" : ""}`}>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="flex flex-wrap items-center gap-2 text-[15px] font-semibold text-odon-encre">
                    {l.nom}
                    {l.ponctuel && <span className="rounded-full border border-odon-turquoise bg-[#E6F7FB] px-2 py-0.5 text-[11px] font-bold text-odon-bleu">Ponctuel</span>}
                  </span>
                  <span className="text-xs text-odon-gris-texte">{l.detail} · {l.pourquoi}</span>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm text-odon-encre">
                    <input inputMode="numeric" disabled={!modifiable} value={l.quantite} onChange={(e) => changer(l.cle, e.target.value)} aria-label={`Quantité de ${l.nom}`} className={champNombre} />
                    {pluriel(l.uniteAchat, l.quantite)}
                  </label>
                  {voitValeurs && <span className="w-20 text-right text-sm font-semibold text-odon-encre">{l.prix == null ? "—" : formaterPrix(l.prix * l.quantite)}</span>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {modifiable && (
        <section className="rounded-xl border border-dashed border-odon-turquoise bg-white p-5">
          {!ajout ? (
            <button type="button" onClick={() => setAjout(true)} className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#E6F7FB] px-4 text-sm font-semibold text-odon-bleu">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
              Ajouter un produit ponctuel
            </button>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-sm font-semibold text-odon-encre">Produit ponctuel · demande particulière, hors consommation et seuils</p>
              {!choix ? (
                <div className="relative max-w-lg">
                  <input autoFocus value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Tapez 3 lettres du produit…" aria-label="Rechercher un produit" className="h-11 w-full rounded-lg border border-[#D5DBE0] px-3 text-sm" />
                  {suggestions.length > 0 && (
                    <ul className="absolute left-0 right-0 top-12 z-10 overflow-hidden rounded-xl border border-[#E3E7EB] bg-white shadow-xl">
                      {suggestions.map((a) => (
                        <li key={a.id}>
                          <button type="button" onClick={() => setChoix(a)} className="w-full px-4 py-2.5 text-left text-sm hover:bg-[#E6F7FB]">
                            <span className="font-semibold text-odon-encre">{a.nom}</span>
                            <span className="ml-2 text-xs text-odon-gris-texte">{a.fournisseur}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <div className="flex flex-wrap items-end gap-3">
                  <span className="flex h-11 items-center rounded-lg bg-odon-gris px-3 text-sm font-semibold text-odon-encre">{choix.nom}</span>
                  <label className="flex flex-col gap-1 text-xs font-semibold text-odon-gris-texte">
                    Quantité ({pluriel(choix.uniteAchat, 2)})
                    <input inputMode="numeric" value={qte} onChange={(e) => setQte(e.target.value.replace(/\D/g, ""))} className="h-11 w-20 rounded-lg border border-[#D5DBE0] px-2 text-center text-sm" />
                  </label>
                  <label className="flex min-w-60 flex-1 flex-col gap-1 text-xs font-semibold text-odon-gris-texte">
                    Note (praticien, date… jamais de nom de patient)
                    <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex. Dr Martin, demande du 12/11" className="h-11 rounded-lg border border-[#D5DBE0] px-3 text-sm text-odon-encre" />
                  </label>
                  <button type="button" onClick={ajouterPonctuel} className="h-11 rounded-lg bg-odon-bleu px-4 text-sm font-semibold text-white">Ajouter</button>
                </div>
              )}
              <button type="button" onClick={() => { setAjout(false); setChoix(null); }} className="self-start text-sm font-semibold text-odon-gris-texte">Annuler</button>
            </div>
          )}
        </section>
      )}

      {erreur && <p role="alert" className="rounded-xl bg-[#FDECE3] px-4 py-3 text-sm font-semibold text-[#9A3412]">{erreur}</p>}

      {modifiable && lignes.length > 0 && (
        <div className="sticky bottom-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-odon-nuit px-5 py-4 text-white shadow-xl">
          <span className="text-sm">
            {actives.length} produit{actives.length > 1 ? "s" : ""}
            {voitValeurs ? ` · environ ${formaterPrix(montant(actives))}` : ""} · quantités arrondies à l&apos;unité d&apos;achat
          </span>
          <button type="button" onClick={valider} disabled={enCours || !actives.length} className="h-11 rounded-lg bg-[#00C8E8] px-5 text-sm font-semibold text-odon-nuit hover:bg-[#4FDCF2] disabled:opacity-40">
            {enCours ? "Validation…" : "Valider la commande"}
          </button>
        </div>
      )}
    </div>
  );
}
