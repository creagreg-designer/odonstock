"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ajouterRotatif, type Resultat } from "./actions";
import { LISTE_STATUTS, STATUTS, type Statut } from "@/lib/rotatifs";

const champ =
  "h-11 w-full rounded-lg border border-[#D5DBE0] bg-white px-3 text-sm text-odon-encre outline-none focus:border-odon-turquoise focus:ring-2 focus:ring-odon-turquoise/30";
const etiquette = "flex flex-col gap-1.5 text-sm font-semibold text-odon-encre";

export default function AjoutRotatif({ types }: { types: { id: string; nom: string }[] }) {
  const fenetre = useRef<HTMLDialogElement>(null);
  const [typeId, setTypeId] = useState("");
  const [numero, setNumero] = useState("");
  const [marque, setMarque] = useState("");
  const [modele, setModele] = useState("");
  const [statut, setStatut] = useState<Statut>("circulation");
  const [erreur, setErreur] = useState("");
  const [confirmation, setConfirmation] = useState<Resultat | null>(null);
  const [enCours, demarrer] = useTransition();

  useEffect(() => {
    if (!confirmation) return;
    const t = setTimeout(() => setConfirmation(null), 5000);
    return () => clearTimeout(t);
  }, [confirmation]);

  function ouvrir() {
    setNumero("");
    setErreur("");
    fenetre.current?.showModal();
  }

  function enregistrer(e: React.FormEvent, encore: boolean) {
    e.preventDefault();
    demarrer(async () => {
      const r = await ajouterRotatif({ typeId, numeroSerie: numero, marque, modele, statut });
      if (!r.ok) {
        setErreur(r.message);
        return;
      }
      setConfirmation(r);
      setErreur("");
      setNumero("");
      // « Enregistrer et ajouter un autre » garde le type, la marque et le modèle
      if (!encore) fenetre.current?.close();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={ouvrir}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-odon-bleu px-4 text-sm font-semibold text-white transition hover:bg-[#002A52]"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
        Ajouter un rotatif
      </button>

      {confirmation && (
        <p role="status" className="fixed bottom-6 left-1/2 z-50 w-[min(92vw,480px)] -translate-x-1/2 rounded-xl bg-[#166534] px-5 py-3.5 text-sm font-semibold text-white shadow-xl">
          ✓ {confirmation.message}
        </p>
      )}

      <dialog
        ref={fenetre}
        aria-labelledby="titre-ajout-rotatif"
        onClick={(e) => e.target === fenetre.current && fenetre.current?.close()}
        className="m-auto w-[min(94vw,520px)] rounded-2xl p-0 shadow-2xl backdrop:bg-[#0A2346]/60 backdrop:backdrop-blur-[2px]"
      >
        <form onSubmit={(e) => enregistrer(e, false)} className="flex flex-col gap-5 p-6">
          <div className="flex items-start justify-between gap-4">
            <h2 id="titre-ajout-rotatif" className="font-titre text-2xl font-semibold text-odon-nuit">Ajouter un rotatif</h2>
            <button type="button" onClick={() => fenetre.current?.close()} aria-label="Fermer" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-odon-gris-texte hover:bg-odon-gris">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className={etiquette}>
              Type *
              <select required value={typeId} onChange={(e) => setTypeId(e.target.value)} className={champ}>
                <option value="" disabled>Choisir…</option>
                {types.map((t) => <option key={t.id} value={t.id}>{t.nom}</option>)}
              </select>
            </label>
            <label className={etiquette}>
              Numéro de série *
              <input required value={numero} onChange={(e) => setNumero(e.target.value)} className={champ} placeholder="Ex. 11802" autoComplete="off" />
            </label>
            <label className={etiquette}>
              Marque
              <input value={marque} onChange={(e) => setMarque(e.target.value)} className={champ} />
            </label>
            <label className={etiquette}>
              Modèle
              <input value={modele} onChange={(e) => setModele(e.target.value)} className={champ} />
            </label>
            <label className={`${etiquette} sm:col-span-2`}>
              Statut
              <select value={statut} onChange={(e) => setStatut(e.target.value as Statut)} className={champ}>
                {LISTE_STATUTS.map((s) => <option key={s} value={s}>{STATUTS[s].label}</option>)}
              </select>
            </label>
          </div>

          {erreur && <p role="alert" className="rounded-lg bg-[#FDECE3] px-3 py-2.5 text-sm font-semibold text-[#9A3412]">{erreur}</p>}

          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={enCours} className="h-11 rounded-lg bg-odon-bleu px-5 text-sm font-semibold text-white hover:bg-[#002A52] disabled:opacity-50">
              Enregistrer
            </button>
            <button
              type="button"
              disabled={enCours}
              onClick={(e) => {
                const form = (e.currentTarget as HTMLButtonElement).form;
                if (form && !form.reportValidity()) return;
                enregistrer(e as unknown as React.FormEvent, true);
              }}
              className="h-11 rounded-lg border border-[#D5DBE0] bg-white px-5 text-sm font-semibold text-odon-bleu hover:bg-[#E6F7FB] disabled:opacity-50"
            >
              Enregistrer et ajouter un autre
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
