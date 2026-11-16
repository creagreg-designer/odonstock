// Page d'accueil provisoire : confirme la connexion, le rôle et l'accès aux données.
// Elle sera remplacée par le tableau de bord.
import { Suspense } from "react";
import { connection } from "next/server";
import Logo from "@/components/logo";
import { creerClientServeur } from "@/lib/supabase/server";
import BoutonDeconnexion from "./bouton-deconnexion";

const ROLES: Record<string, string> = {
  admin: "Administrateur",
  direction: "Direction",
  responsable: "Responsable de stock",
  poste: "Poste du centre",
};

async function Bienvenue() {
  // Contenu propre à chaque personne : calculé à chaque visite, jamais à l'avance.
  await connection();
  const supabase = await creerClientServeur();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profil } = await supabase
    .from("profils")
    .select("nom, role, centres(nom)")
    .eq("id", user.id)
    .single();

  const [{ count: nbLieux }, { count: nbCategories }, { count: nbTypes }] = await Promise.all([
    supabase.from("lieux").select("*", { count: "exact", head: true }),
    supabase.from("categories").select("*", { count: "exact", head: true }),
    supabase.from("rotatif_types").select("*", { count: "exact", head: true }),
  ]);

  const centreBrut = profil?.centres as { nom: string } | { nom: string }[] | null | undefined;
  const centre = Array.isArray(centreBrut) ? centreBrut[0]?.nom : centreBrut?.nom;
  const role = profil?.role ?? "poste";
  const sansAcces = role === "poste" && !centre;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-odon-encre">Bonjour {profil?.nom ?? user.email}</h1>
        <p className="mt-1 text-odon-gris-texte">
          {ROLES[role] ?? role}
          {centre ? ` · ${centre}` : ""}
        </p>
      </div>

      {sansAcces ? (
        <p className="rounded-xl bg-[#FEF3C7] px-4 py-3 font-medium text-[#854D0E]">
          Votre compte n&apos;a pas encore d&apos;accès. Demandez à l&apos;administrateur de vous attribuer un rôle et un centre.
        </p>
      ) : (
        <div className="rounded-xl bg-[#E3F4EA] px-4 py-3 text-[#166534]">
          <p className="font-semibold">✓ Connexion et base de données opérationnelles</p>
          <p className="mt-1 text-sm">
            {nbLieux ?? 0} lieux de sortie · {nbCategories ?? 0} catégories · {nbTypes ?? 0} types de rotatifs
          </p>
        </div>
      )}
    </div>
  );
}

export default function Accueil() {
  return (
    <main className="min-h-screen bg-odon-gris">
      <header className="flex items-center justify-between bg-odon-nuit px-6 py-4">
        <Logo taille={34} surFondSombre />
        <BoutonDeconnexion />
      </header>
      <div className="mx-auto max-w-2xl px-6 py-10">
        <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-black/5">
          <Suspense fallback={<p className="text-odon-gris-texte">Chargement…</p>}>
            <Bienvenue />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
