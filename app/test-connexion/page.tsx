// Page de test temporaire : vérifie que l'application joint bien Supabase.
// Elle sera supprimée une fois la mise en place terminée.

import { Suspense } from "react";

async function verifierSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const cle = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !cle) {
    return { ok: false, detail: "Le fichier .env.local n'est pas lu : relancez npm run dev." };
  }

  try {
    const reponse = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: cle },
      cache: "no-store",
    });
    if (reponse.ok) return { ok: true, detail: "Supabase répond correctement." };
    if (reponse.status === 401) return { ok: false, detail: "Supabase refuse la clé (erreur 401) : vérifiez la publishable key." };
    return { ok: false, detail: `Supabase a répondu avec l'erreur ${reponse.status}.` };
  } catch {
    return { ok: false, detail: "Impossible de joindre Supabase : vérifiez l'adresse du projet." };
  }
}

async function Resultat() {
  const { ok, detail } = await verifierSupabase();
  return (
    <>
      <p
        style={{
          marginTop: 24,
          padding: "16px 20px",
          borderRadius: 12,
          fontSize: 18,
          fontWeight: 600,
          background: ok ? "#E3F4EA" : "#FDECE3",
          color: ok ? "#166534" : "#9A3412",
        }}
      >
        {ok ? "✓ Connexion réussie" : "✗ Connexion impossible"}
      </p>
      <p style={{ marginTop: 12, color: "#5B6772" }}>{detail}</p>
    </>
  );
}

export default function TestConnexion() {
  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: 48, maxWidth: 560 }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>
        <span style={{ color: "#00386D" }}>Odon</span>
        <span style={{ color: "#00A6C6" }}>Stock</span> · test de connexion
      </h1>
      <Suspense fallback={<p style={{ marginTop: 24, color: "#5B6772" }}>Vérification en cours…</p>}>
        <Resultat />
      </Suspense>
    </main>
  );
}
