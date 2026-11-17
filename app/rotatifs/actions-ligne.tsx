"use client";

import { useRef, useState, useTransition } from "react";
import { modifierRotatif, supprimerRotatif } from "./actions";

type Rotatif = { id: string; typeId: string; numeroSerie: string | null; marque: string | null; modele: string | null };

const champ =
  "h-11 w-full rounded-lg border border-[#D5DBE0] bg-white px-3 text-sm text-odon-encre outline-none focus:border-odon-turquoise focus:ring-2 focus:ring-odon-turquoise/30";
const etiquette = "flex flex-col gap-1.5 text-sm font-semibold text-odon-encre";

// Boutons « modifier » et « supprimer » d'une ligne du parc (administrateur)
export default function ActionsLigne({ rotatif, types }: { rotatif: Rotatif; types: { id: string; nom: string }[] }) {
  const fenetre = useRef<HTMLDialogElement>(null);
  const [typeId, setTypeId] = useState(rotatif.typeId);
  const [numero, setNumero] = useState(rotatif.numeroSerie ?? "");
  const [marque, setMarque] = useState(rotatif.marque ?? "");
  const [modele, setModele] = useState(rotatif.modele ?? "");
  const [erreur, setErreur] = useState("");
  const [confirmer, setConfirmer] = useState(false);
  const [enCours, demarrer] = useTransition();

  function ouvrir() {
    setTypeId(rotatif.typeId);
    setNumero(rotatif.numeroSerie ?? "");
    setMarque(rotatif.marque ?? "");
    setModele(rotatif.modele ?? "");
    setErreur("");
    fenetre.current?.showModal();
  }

  const icone = "flex h-9 w-9 items-center justify-center rounded-lg text-odon-gris-texte transition";

  if (confirmer) {
    return (
      <span className="inline-flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          disabled={enCours}
          onClick={() =>
            demarrer(async () => {
              const r = await supprimerRotatif(rotatif.id);
              if (!r.ok) {
                setErreur(r.message);
                setConfirmer(false);
              }
            })
          }
          className="h-9 rounded-lg bg-odon-alerte px-3 text-xs font-semibold text-white disabled:opacity-50"
        >
          {enCours ? "Suppression…" : "Confirmer"}
        </button>
        <button type="button" onClick={() => setConfirmer(false)} className="h-9 px-2 text-xs font-semibold text-odon-gris-texte">
          Annuler
        </button>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center justify-end gap-1">
      <button type="button" onClick={ouvrir} aria-label={`Modifier le rotatif ${rotatif.numeroSerie ? `n° ${rotatif.numeroSerie}` : "sans numéro"}`} className={`${icone} hover:bg-[#E6F7FB] hover:text-odon-bleu`}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
        </svg>
      </button>
      <button type="button" onClick={() => setConfirmer(true)} aria-label={`Supprimer le rotatif ${rotatif.numeroSerie ? `n° ${rotatif.numeroSerie}` : "sans numéro"}`} className={`${icone} hover:bg-[#FDECE3] hover:text-odon-alerte`}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" />
        </svg>
      </button>
      {erreur && <span role="alert" className="text-xs font-semibold text-[#9A3412]">{erreur}</span>}

      <dialog
        ref={fenetre}
        aria-labelledby={`titre-modif-${rotatif.id}`}
        onClick={(e) => e.target === fenetre.current && fenetre.current?.close()}
        className="m-auto w-[min(94vw,520px)] rounded-2xl p-0 text-left shadow-2xl backdrop:bg-[#0A2346]/60 backdrop:backdrop-blur-[2px]"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            demarrer(async () => {
              const r = await modifierRotatif(rotatif.id, { typeId, numeroSerie: numero, marque, modele });
              if (r.ok) fenetre.current?.close();
              else setErreur(r.message);
            });
          }}
          className="flex flex-col gap-5 p-6"
        >
          <div className="flex items-start justify-between gap-4">
            <h2 id={`titre-modif-${rotatif.id}`} className="font-titre text-2xl font-semibold text-odon-nuit">Modifier le rotatif</h2>
            <button type="button" onClick={() => fenetre.current?.close()} aria-label="Fermer" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-odon-gris-texte hover:bg-odon-gris">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={etiquette}>
              Type *
              <select required value={typeId} onChange={(e) => setTypeId(e.target.value)} className={champ}>
                {types.map((t) => <option key={t.id} value={t.id}>{t.nom}</option>)}
              </select>
            </label>
            <label className={etiquette}>
              Numéro de série
              <input value={numero} onChange={(e) => setNumero(e.target.value)} className={champ} autoComplete="off" />
            </label>
            <label className={etiquette}>
              Marque
              <input value={marque} onChange={(e) => setMarque(e.target.value)} className={champ} />
            </label>
            <label className={etiquette}>
              Modèle
              <input value={modele} onChange={(e) => setModele(e.target.value)} className={champ} />
            </label>
          </div>
          <p className="text-xs text-odon-gris-texte">Le statut se change directement dans la liste.</p>
          {erreur && <p role="alert" className="rounded-lg bg-[#FDECE3] px-3 py-2.5 text-sm font-semibold text-[#9A3412]">{erreur}</p>}
          <div className="flex gap-3">
            <button type="submit" disabled={enCours} className="h-11 rounded-lg bg-odon-bleu px-5 text-sm font-semibold text-white hover:bg-[#002A52] disabled:opacity-50">
              Enregistrer
            </button>
            <button type="button" onClick={() => fenetre.current?.close()} className="h-11 rounded-lg border border-[#D5DBE0] bg-white px-5 text-sm font-semibold text-odon-bleu hover:bg-[#E6F7FB]">
              Annuler
            </button>
          </div>
        </form>
      </dialog>
    </span>
  );
}
