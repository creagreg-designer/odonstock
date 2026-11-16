"use client";

import { useState } from "react";
import { creerClientNavigateur } from "@/lib/supabase/client";

export default function FormulaireConnexion() {
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);

  async function seConnecter(e: React.FormEvent) {
    e.preventDefault();
    setErreur("");
    setEnvoi(true);
    const supabase = creerClientNavigateur();
    const { error } = await supabase.auth.signInWithPassword({ email, password: motDePasse });
    if (error) {
      setErreur("E-mail ou mot de passe incorrect.");
      setEnvoi(false);
      return;
    }
    window.location.assign("/");
  }

  const champ =
    "h-12 w-full rounded-lg border border-[#D5DBE0] px-3 text-base text-odon-encre outline-none focus:border-odon-turquoise focus:ring-2 focus:ring-odon-turquoise/30";

  return (
    <form onSubmit={seConnecter} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm font-semibold text-odon-encre">
        E-mail
        <input type="email" required autoComplete="email" value={email}
          onChange={(e) => setEmail(e.target.value)} className={champ} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-semibold text-odon-encre">
        Mot de passe
        <input type="password" required autoComplete="current-password" value={motDePasse}
          onChange={(e) => setMotDePasse(e.target.value)} className={champ} />
      </label>
      {erreur && (
        <p role="alert" className="rounded-lg bg-[#FDECE3] px-3 py-2 text-sm font-medium text-[#9A3412]">
          {erreur}
        </p>
      )}
      <button type="submit" disabled={envoi}
        className="mt-2 h-12 rounded-lg bg-odon-bleu font-semibold text-white transition hover:bg-[#002A52] disabled:opacity-60">
        {envoi ? "Connexion…" : "Se connecter"}
      </button>
    </form>
  );
}
