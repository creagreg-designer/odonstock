"use client";

import { creerClientNavigateur } from "@/lib/supabase/client";

export default function BoutonDeconnexion() {
  async function seDeconnecter() {
    await creerClientNavigateur().auth.signOut();
    window.location.assign("/connexion");
  }
  return (
    <button
      type="button"
      onClick={seDeconnecter}
      className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-[#C9D6E5] hover:bg-white/5"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
      </svg>
      Se déconnecter
    </button>
  );
}
