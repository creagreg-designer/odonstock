"use client";

import { useState } from "react";
import ChoixUnite from "./choix-unite";
import { pluriel } from "@/lib/format";

type Props = { champ: string; etiquette: string; aide: string };

// Bloc « Unités » avec une phrase de vérification qui suit la saisie.
export default function BlocUnites({ champ, etiquette, aide }: Props) {
  const [achat, setAchat] = useState("boîte");
  const [sortie, setSortie] = useState("boîte");
  const [nombre, setNombre] = useState("1");
  const [contenu, setContenu] = useState("");
  const [uniteContenu, setUniteContenu] = useState("");

  const n = Number.parseInt(nombre, 10);
  const valide = Number.isInteger(n) && n >= 1;
  const meme = achat === sortie;

  const c = Number.parseInt(contenu, 10);
  const avecContenu = Number.isInteger(c) && c >= 1 && uniteContenu.trim() !== "";
  const uc = uniteContenu.trim();
  const detail = avecContenu ? ` de ${c} ${pluriel(uc, c)}` : "";

  let phrase: string;
  if (!valide) phrase = "Indiquez un nombre entier, au moins 1.";
  else if (meme || n === 1) phrase = `On sort à la ${achat}${detail} : un scan sort 1 ${achat}${detail}.`;
  else
    phrase =
      `1 ${achat} = ${n} ${pluriel(sortie, n)}${detail}` +
      (avecContenu ? `, soit ${n * c} ${pluriel(uc, n * c)}` : "") +
      ` · un scan sort 1 ${sortie}${detail}.`;

  return (
    <>
      <div className="grid gap-5 sm:grid-cols-3">
        <label className={etiquette}>
          On achète à la…
          <ChoixUnite name="unite_achat" className={champ} onChange={setAchat} />
        </label>
        <label className={etiquette}>
          On sort à la…
          <ChoixUnite name="unite_sortie" className={champ} onChange={setSortie} />
        </label>
        <label className={etiquette}>
          Combien par unité d&apos;achat
          <input
            name="sorties_par_achat"
            type="number"
            min={1}
            step={1}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
            className={champ}
          />
          <span className={aide}>Laisser 1 si on sort à la même unité qu&apos;on achète</span>
        </label>
      </div>
      <div className="grid gap-5 sm:grid-cols-3">
        <label className={`${etiquette} sm:col-span-2`}>
          <span>
            Une {meme ? achat : sortie} contient… <span className="font-normal text-odon-gris-texte">(facultatif)</span>
          </span>
          <span className="grid grid-cols-[110px_minmax(0,1fr)] gap-3">
            <input
              name="contenu_sortie"
              type="number"
              min={1}
              step={1}
              value={contenu}
              onChange={(e) => setContenu(e.target.value)}
              placeholder="10"
              aria-label="Quantité contenue"
              className={champ}
            />
            <input
              name="unite_contenu"
              list="liste-contenus"
              value={uniteContenu}
              onChange={(e) => setUniteContenu(e.target.value)}
              placeholder="carpule, gant, compresse…"
              aria-label="Unité contenue"
              className={champ}
            />
          </span>
          <span className={aide}>Exemple : une plaquette contient 10 carpules. Sert à l&apos;étiquette et à l&apos;analytique.</span>
        </label>
        <datalist id="liste-contenus">
          {["carpule", "unité", "gant", "compresse", "champ", "aiguille", "lame", "seringue", "embout", "lime", "cône", "sachet"].map((u) => (
            <option key={u} value={u} />
          ))}
        </datalist>
      </div>
      <p
        aria-live="polite"
        className={`rounded-lg px-4 py-3 text-sm font-semibold ${
          valide ? "bg-[#E6F7FB] text-odon-bleu" : "bg-[#FDECE3] text-[#9A3412]"
        }`}
      >
        {phrase}
      </p>
    </>
  );
}
