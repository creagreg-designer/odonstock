"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { enregistrerEmprunt, type Resultat } from "./actions";

type Props = {
  tailles: { id: string; nom: string; dispo: number }[];
  personnes: { id: string; prenom: string }[];
};

// Bouton « Emprunter » qui ouvre une fenêtre : tailles, puis prénom de l'assistante.
export default function EmpruntRapide({ tailles, personnes }: Props) {
  const fenetre = useRef<HTMLDialogElement>(null);
  const [panier, setPanier] = useState<Record<string, number>>({});
  const [erreur, setErreur] = useState("");
  const [confirmation, setConfirmation] = useState<Resultat | null>(null);
  const [enCours, demarrer] = useTransition();

  // Le message de confirmation s'efface après 5 secondes
  useEffect(() => {
    if (!confirmation) return;
    const minuteur = setTimeout(() => setConfirmation(null), 5000);
    return () => clearTimeout(minuteur);
  }, [confirmation]);

  const lignes = tailles.filter((t) => (panier[t.id] ?? 0) > 0).map((t) => ({ ...t, quantite: panier[t.id] }));
  const resume = lignes.map((l) => `${l.quantite} × ${l.nom}`).join(", ");
  const totalDispo = tailles.reduce((n, t) => n + t.dispo, 0);

  function ouvrir() {
    setPanier({});
    setErreur("");
    setConfirmation(null);
    fenetre.current?.showModal();
  }

  function fermer() {
    fenetre.current?.close();
  }

  function valider(personne: { id: string; prenom: string }) {
    if (!lignes.length) {
      setErreur("Touchez d'abord une ou plusieurs tailles.");
      return;
    }
    demarrer(async () => {
      const r = await enregistrerEmprunt(personne.id, lignes.map((l) => ({ tailleId: l.id, quantite: l.quantite })));
      if (r.ok) {
        setConfirmation({ ok: true, message: `Emprunt enregistré pour ${personne.prenom} : ${resume}.` });
        fermer();
      } else {
        setErreur(r.message);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={ouvrir}
        disabled={totalDispo === 0}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-odon-bleu px-4 text-sm font-semibold text-white transition hover:bg-[#002A52] disabled:opacity-50"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
        Emprunter
      </button>

      {confirmation && (
        <p
          role="status"
          className="fixed bottom-6 left-1/2 z-50 w-[min(92vw,480px)] -translate-x-1/2 rounded-xl bg-[#166534] px-5 py-3.5 text-sm font-semibold text-white shadow-xl"
        >
          ✓ {confirmation.message}
        </p>
      )}

      <dialog
        ref={fenetre}
        aria-labelledby="titre-emprunt"
        onClick={(e) => e.target === fenetre.current && fermer()}
        className="m-auto w-[min(94vw,560px)] rounded-2xl p-0 shadow-2xl backdrop:bg-[#0A2346]/60 backdrop:backdrop-blur-[2px]"
      >
        <div className="flex flex-col gap-5 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="titre-emprunt" className="font-titre text-2xl font-semibold text-odon-nuit">Emprunter des scan posts</h2>
              <p className="mt-1 text-sm text-odon-gris-texte">Tailles, puis prénom de l&apos;assistante</p>
            </div>
            <button type="button" onClick={fermer} aria-label="Fermer" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-odon-gris-texte hover:bg-odon-gris">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>

          <div className="flex flex-col gap-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-odon-encre">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-odon-turquoise text-xs font-bold text-white">1</span>
              Une touche par scan post pris
            </p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {tailles.map((t) => {
                const n = panier[t.id] ?? 0;
                const epuise = n >= t.dispo;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => { setErreur(""); setPanier((p) => ({ ...p, [t.id]: n + 1 })); }}
                    disabled={epuise || enCours}
                    aria-label={`${t.nom}, ${t.dispo} disponible${t.dispo > 1 ? "s" : ""}${n ? `, ${n} choisi${n > 1 ? "s" : ""}` : ""}`}
                    className={`flex min-h-[72px] flex-col items-center justify-center gap-1 rounded-xl border-2 text-base font-bold transition disabled:cursor-not-allowed ${
                      n > 0 ? "border-odon-bleu bg-odon-bleu text-white" : "border-[#D5DBE0] bg-white text-odon-bleu hover:border-odon-turquoise disabled:opacity-40"
                    }`}
                  >
                    {t.nom}
                    {n > 0 ? (
                      <span className="rounded-full bg-odon-turquoise px-2 text-xs font-bold text-white">×{n}</span>
                    ) : (
                      <span className="text-[11px] font-medium opacity-70">{t.dispo} dispo</span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="flex min-h-11 items-center justify-between gap-3 rounded-lg bg-odon-gris px-3 py-2">
              <span className="text-sm font-semibold text-odon-encre">{resume ? `À emprunter : ${resume}` : "Aucune taille choisie"}</span>
              {resume && (
                <button type="button" onClick={() => setPanier({})} className="h-8 px-2 text-sm font-semibold text-odon-gris-texte hover:text-odon-encre">
                  Effacer
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-odon-encre">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-odon-turquoise text-xs font-bold text-white">2</span>
              L&apos;assistante : son prénom valide l&apos;emprunt
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {personnes.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => valider(p)}
                  disabled={enCours || !lignes.length}
                  className="min-h-[52px] rounded-xl border-2 border-[#D5DBE0] bg-white text-[15px] font-semibold text-odon-bleu transition hover:border-odon-turquoise hover:bg-[#E6F7FB] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {p.prenom}
                </button>
              ))}
            </div>
          </div>

          {erreur && (
            <p role="alert" className="rounded-lg bg-[#FDECE3] px-3 py-2.5 text-sm font-semibold text-[#9A3412]">{erreur}</p>
          )}
        </div>
      </dialog>
    </>
  );
}
