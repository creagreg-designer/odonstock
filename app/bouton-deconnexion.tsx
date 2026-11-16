"use client";

import { creerClientNavigateur } from "@/lib/supabase/client";

export default function BoutonDeconnexion() {
  async function seDeconnecter() {
    await creerClientNavigateur().auth.signOut();
    window.location.assign("/connexion");
  }
  return (
    <button type="button" onClick={seDeconnecter}
      className="h-11 rounded-lg border border-[#D5DBE0] bg-white px-4 text-sm font-semibold text-odon-bleu hover:bg-odon-gris">
      Se déconnecter
    </button>
  );
}
