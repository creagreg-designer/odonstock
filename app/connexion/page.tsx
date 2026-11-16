import Logo from "@/components/logo";
import FormulaireConnexion from "./formulaire";

export const metadata = { title: "Connexion · OdonStock" };

export default function PageConnexion() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-odon-gris px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm ring-1 ring-black/5">
        <div className="mb-8 flex justify-center">
          <Logo taille={44} />
        </div>
        <h1 className="mb-1 text-xl font-bold text-odon-encre">Connexion</h1>
        <p className="mb-6 text-sm text-odon-gris-texte">Gestion des consommables et du matériel</p>
        <FormulaireConnexion />
      </div>
    </main>
  );
}
