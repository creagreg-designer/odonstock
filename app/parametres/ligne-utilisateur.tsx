"use client";

import { useState, useTransition } from "react";
import { majUtilisateur } from "./actions";

type Props = {
  id: string;
  nom: string;
  role: string;
  centreId: string | null;
  centres: { id: string; nom: string }[];
  roles: Record<string, string>;
  moi: boolean;
};

const champ = "h-10 rounded-lg border border-[#D5DBE0] bg-white px-3 text-sm text-odon-encre";

export default function LigneUtilisateur({ id, nom, role, centreId, centres, roles, moi }: Props) {
  const [n, setN] = useState(nom);
  const [r, setR] = useState(role);
  const [c, setC] = useState(centreId ?? "");
  const [etat, setEtat] = useState<{ ok: boolean; message: string } | null>(null);
  const [enCours, demarrer] = useTransition();
  const change = n !== nom || r !== role || c !== (centreId ?? "");

  return (
    <tr className="border-t border-[#EEF1F4] align-middle">
      <td className="px-5 py-3">
        <input value={n} onChange={(e) => { setN(e.target.value); setEtat(null); }} aria-label="Prénom et nom" className={`${champ} w-full min-w-44`} />
        {moi && <span className="mt-1 block text-xs text-odon-gris-texte">C&apos;est vous</span>}
      </td>
      <td className="px-3 py-3">
        <select value={r} onChange={(e) => { setR(e.target.value); setEtat(null); }} aria-label="Rôle" className={`${champ} min-w-52`}>
          {Object.entries(roles).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </td>
      <td className="px-3 py-3">
        <select value={c} onChange={(e) => { setC(e.target.value); setEtat(null); }} aria-label="Centre" className={`${champ} min-w-44`}>
          <option value="">Aucun centre</option>
          {centres.map((x) => <option key={x.id} value={x.id}>{x.nom}</option>)}
        </select>
      </td>
      <td className="px-5 py-3 text-right">
        {change ? (
          <button
            type="button"
            disabled={enCours}
            onClick={() => demarrer(async () => setEtat(await majUtilisateur(id, { nom: n, role: r, centreId: c || null })))}
            className="h-10 rounded-lg bg-odon-bleu px-4 text-xs font-semibold text-white disabled:opacity-50"
          >
            Enregistrer
          </button>
        ) : etat?.ok ? (
          <span className="text-xs font-semibold text-[#166534]">✓ Enregistré</span>
        ) : null}
        {etat && !etat.ok && <span role="alert" className="block text-xs font-semibold text-[#9A3412]">{etat.message}</span>}
      </td>
    </tr>
  );
}
