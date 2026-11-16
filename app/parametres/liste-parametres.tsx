"use client";

import { useState, useTransition } from "react";
import type { Resultat } from "./actions";

export type Element = { id: string; libelle: string; detail?: string; actif?: boolean };

type Props = {
  elements: Element[];
  modifiable: boolean;
  placeholder: string;
  vide: string;
  onAjouter?: (texte: string) => Promise<Resultat>;
  onRenommer?: (id: string, texte: string) => Promise<Resultat>;
  onBasculer?: (id: string, actif: boolean) => Promise<Resultat>;
  onDeplacer?: (id: string, sens: -1 | 1) => Promise<Resultat>;
};

const petitBouton =
  "flex h-9 w-9 items-center justify-center rounded-lg text-odon-gris-texte transition hover:bg-[#E6F7FB] hover:text-odon-bleu disabled:opacity-30";

function Ligne({ e, premier, dernier, props }: { e: Element; premier: boolean; dernier: boolean; props: Props }) {
  const [edition, setEdition] = useState(false);
  const [texte, setTexte] = useState(e.libelle);
  const [erreur, setErreur] = useState("");
  const [enCours, demarrer] = useTransition();
  const lancer = (f: () => Promise<Resultat>, apres?: () => void) =>
    demarrer(async () => {
      const r = await f();
      if (r.ok) {
        setErreur("");
        apres?.();
      } else setErreur(r.message);
    });

  return (
    <li className={`flex flex-wrap items-center justify-between gap-3 border-t border-[#EEF1F4] px-5 py-3 first:border-t-0 ${e.actif === false ? "bg-odon-gris/60" : ""}`}>
      {edition ? (
        <form
          className="flex flex-1 flex-wrap items-center gap-2"
          onSubmit={(ev) => {
            ev.preventDefault();
            lancer(() => props.onRenommer!(e.id, texte), () => setEdition(false));
          }}
        >
          <input autoFocus value={texte} onChange={(ev) => setTexte(ev.target.value)} aria-label="Nouveau nom" className="h-10 min-w-48 flex-1 rounded-lg border border-[#D5DBE0] px-3 text-sm outline-none focus:border-odon-turquoise" />
          <button type="submit" disabled={enCours} className="h-10 rounded-lg bg-odon-bleu px-4 text-sm font-semibold text-white disabled:opacity-50">Enregistrer</button>
          <button type="button" onClick={() => { setEdition(false); setTexte(e.libelle); }} className="h-10 px-2 text-sm font-semibold text-odon-gris-texte">Annuler</button>
        </form>
      ) : (
        <span className="flex min-w-0 flex-col">
          <span className={`font-medium ${e.actif === false ? "text-odon-gris-texte line-through" : "text-odon-encre"}`}>{e.libelle}</span>
          {e.detail && <span className="text-xs text-odon-gris-texte">{e.detail}</span>}
        </span>
      )}

      {props.modifiable && !edition && (
        <span className="flex items-center gap-1">
          {props.onDeplacer && (
            <>
              <button type="button" disabled={premier || enCours} onClick={() => lancer(() => props.onDeplacer!(e.id, -1))} aria-label={`Monter ${e.libelle}`} className={petitBouton}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 15l-6-6-6 6" /></svg>
              </button>
              <button type="button" disabled={dernier || enCours} onClick={() => lancer(() => props.onDeplacer!(e.id, 1))} aria-label={`Descendre ${e.libelle}`} className={petitBouton}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
              </button>
            </>
          )}
          {props.onRenommer && (
            <button type="button" onClick={() => setEdition(true)} aria-label={`Renommer ${e.libelle}`} className={petitBouton}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>
            </button>
          )}
          {props.onBasculer && (
            <button
              type="button"
              disabled={enCours}
              onClick={() => lancer(() => props.onBasculer!(e.id, e.actif === false))}
              className={`ml-1 h-9 rounded-lg px-3 text-xs font-semibold ${e.actif === false ? "bg-[#E3F4EA] text-[#166534]" : "border border-[#D5DBE0] text-odon-gris-texte hover:text-odon-encre"}`}
            >
              {e.actif === false ? "Réactiver" : "Désactiver"}
            </button>
          )}
        </span>
      )}
      {erreur && <p role="alert" className="w-full text-xs font-semibold text-[#9A3412]">{erreur}</p>}
    </li>
  );
}

// Liste réglable : ajout, renommage, ordre, activation
export default function ListeParametres(props: Props) {
  const [nouveau, setNouveau] = useState("");
  const [erreur, setErreur] = useState("");
  const [enCours, demarrer] = useTransition();

  return (
    <div className="rounded-xl border border-[#E3E7EB] bg-white">
      {props.elements.length === 0 ? (
        <p className="px-6 py-8 text-center text-sm text-odon-gris-texte">{props.vide}</p>
      ) : (
        <ul>
          {props.elements.map((e, i) => (
            <Ligne key={e.id} e={e} premier={i === 0} dernier={i === props.elements.length - 1} props={props} />
          ))}
        </ul>
      )}
      {props.modifiable && props.onAjouter && (
        <form
          className="flex flex-wrap items-center gap-2 border-t border-[#EEF1F4] bg-odon-gris/50 px-5 py-4"
          onSubmit={(ev) => {
            ev.preventDefault();
            demarrer(async () => {
              const r = await props.onAjouter!(nouveau);
              if (r.ok) {
                setNouveau("");
                setErreur("");
              } else setErreur(r.message);
            });
          }}
        >
          <input value={nouveau} onChange={(ev) => setNouveau(ev.target.value)} placeholder={props.placeholder} aria-label={props.placeholder} className="h-11 min-w-56 flex-1 rounded-lg border border-[#D5DBE0] bg-white px-3 text-sm outline-none focus:border-odon-turquoise" />
          <button type="submit" disabled={enCours || !nouveau.trim()} className="inline-flex h-11 items-center gap-2 rounded-lg bg-odon-bleu px-4 text-sm font-semibold text-white disabled:opacity-50">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
            Ajouter
          </button>
          {erreur && <p role="alert" className="w-full text-xs font-semibold text-[#9A3412]">{erreur}</p>}
        </form>
      )}
    </div>
  );
}
