"use client";

import { useState, useTransition } from "react";
import { enregistrerPartiel, toutRendre, type Resultat } from "./actions";

export type Groupe = {
  personneId: string;
  prenom: string;
  items: { tailleId: string; nom: string; quantite: number }[];
  info: string;
  nonRendu: boolean;
};

type Mode = "retour" | "perte" | null;

function Ligne({ g, lectureSeule }: { g: Groupe; lectureSeule: boolean }) {
  const [mode, setMode] = useState<Mode>(null);
  const [quantites, setQuantites] = useState<Record<string, number>>({});
  const [retour, setRetour] = useState<Resultat | null>(null);
  const [enCours, demarrer] = useTransition();

  const total = Object.values(quantites).reduce((n, q) => n + q, 0);
  const plusieurs = g.items.length > 1 || g.items[0]?.quantite > 1;

  function ouvrir(m: Exclude<Mode, null>) {
    setRetour(null);
    setQuantites({});
    setMode((actuel) => (actuel === m ? null : m));
  }

  function changer(tailleId: string, ecart: number, max: number) {
    setQuantites((q) => ({ ...q, [tailleId]: Math.min(max, Math.max(0, (q[tailleId] ?? 0) + ecart)) }));
  }

  function valider() {
    if (!mode) return;
    demarrer(async () => {
      const r = await enregistrerPartiel(
        mode,
        g.personneId,
        Object.entries(quantites).map(([tailleId, quantite]) => ({ tailleId, quantite })),
      );
      setRetour(r);
      if (r.ok) setMode(null);
    });
  }

  const boutonSecondaire =
    "h-11 rounded-lg border bg-white px-4 text-sm font-semibold transition disabled:opacity-50";

  return (
    <div className={`flex flex-col gap-3 border-t border-[#EEF1F4] py-4 first:border-t-0 ${g.nonRendu ? "-mx-3 rounded-xl bg-[#FFF7F3] px-3" : ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[15px] font-semibold text-odon-encre">{g.prenom}</span>
          <span className="text-sm text-odon-encre">{g.items.map((i) => `${i.quantite} × ${i.nom}`).join(" · ")}</span>
          <span className={`text-xs ${g.nonRendu ? "font-semibold text-[#9A3412]" : "text-odon-gris-texte"}`}>{g.info}</span>
        </div>
        {!lectureSeule && <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={enCours}
            onClick={() => demarrer(async () => setRetour(await toutRendre(g.personneId)))}
            className="h-11 rounded-lg bg-odon-bleu px-4 text-sm font-semibold text-white hover:bg-[#002A52] disabled:opacity-50"
          >
            Tout rendu
          </button>
          {plusieurs && (
            <button
              type="button"
              disabled={enCours}
              aria-expanded={mode === "retour"}
              onClick={() => ouvrir("retour")}
              className={`${boutonSecondaire} border-[#D5DBE0] text-odon-bleu hover:bg-[#E6F7FB] ${mode === "retour" ? "ring-2 ring-odon-turquoise" : ""}`}
            >
              Rendu en partie…
            </button>
          )}
          <button
            type="button"
            disabled={enCours}
            aria-expanded={mode === "perte"}
            onClick={() => ouvrir("perte")}
            className={`${boutonSecondaire} border-[#F0C3AE] text-[#9A3412] hover:bg-[#FFF7F3] ${mode === "perte" ? "ring-2 ring-[#F0C3AE]" : ""}`}
          >
            Perdu…
          </button>
        </div>}
      </div>

      {mode && (
        <div className={`flex flex-col gap-3 rounded-xl bg-white p-4 ring-1 ${mode === "retour" ? "ring-odon-turquoise/50" : "ring-[#F0C3AE]"}`}>
          <p className="text-sm font-semibold text-odon-encre">
            {mode === "retour" ? "Combien sont rendus ?" : "Combien sont perdus ?"}
          </p>
          <div className="flex flex-wrap gap-3">
            {g.items.map((i) => {
              const n = quantites[i.tailleId] ?? 0;
              return (
                <div key={i.tailleId} className="flex items-center gap-2 rounded-lg border border-[#E3E7EB] px-2 py-1.5">
                  <span className="min-w-14 text-sm font-semibold text-odon-encre">{i.nom}</span>
                  <button
                    type="button"
                    onClick={() => changer(i.tailleId, -1, i.quantite)}
                    disabled={n === 0}
                    aria-label={`Un ${i.nom} de moins`}
                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#D5DBE0] text-lg font-semibold text-odon-bleu disabled:opacity-30"
                  >
                    −
                  </button>
                  <span className="w-12 text-center text-sm font-bold text-odon-encre" aria-live="polite">
                    {n}/{i.quantite}
                  </span>
                  <button
                    type="button"
                    onClick={() => changer(i.tailleId, 1, i.quantite)}
                    disabled={n >= i.quantite}
                    aria-label={`Un ${i.nom} de plus`}
                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#D5DBE0] text-lg font-semibold text-odon-bleu disabled:opacity-30"
                  >
                    +
                  </button>
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={enCours || total === 0}
              onClick={valider}
              className={`h-11 rounded-lg px-4 text-sm font-semibold text-white disabled:opacity-40 ${mode === "retour" ? "bg-odon-bleu hover:bg-[#002A52]" : "bg-odon-alerte"}`}
            >
              {mode === "retour"
                ? `Valider le retour${total ? ` (${total})` : ""}`
                : `Déclarer la perte${total ? ` (${total})` : ""}`}
            </button>
            <button type="button" onClick={() => setMode(null)} className="h-11 px-3 text-sm font-semibold text-odon-gris-texte hover:text-odon-encre">
              Annuler
            </button>
          </div>
        </div>
      )}

      {retour && !retour.ok && (
        <p role="alert" className="text-sm font-semibold text-[#9A3412]">{retour.message}</p>
      )}
    </div>
  );
}

export default function ListeEmpruntes({ groupes, lectureSeule = false }: { groupes: Groupe[]; lectureSeule?: boolean }) {
  return (
    <section className="rounded-xl border border-[#E3E7EB] bg-white p-5">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h2 className="text-base font-semibold text-odon-encre">Empruntés en ce moment</h2>
        <span className="text-xs text-odon-gris-texte">à rendre avant ce soir</span>
      </div>
      {groupes.length === 0 ? (
        <p className="py-8 text-center text-sm text-odon-gris-texte">Tous les scan posts sont rangés.</p>
      ) : (
        groupes.map((g) => <Ligne key={g.personneId} g={g} lectureSeule={lectureSeule} />)
      )}
    </section>
  );
}
