import Logo from "@/components/logo";
import FormulaireConnexion from "./formulaire";

export const metadata = { title: "Connexion · OdonStock" };

// Coins de scan décoratifs, repris du logo
function CoinsDeScan({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" className={className}>
      <g fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
        <path d="M4 12V9a5 5 0 0 1 5-5h3" />
        <path d="M28 4h3a5 5 0 0 1 5 5v3" />
        <path d="M36 28v3a5 5 0 0 1-5 5h-3" />
        <path d="M12 36H9a5 5 0 0 1-5-5v-3" />
      </g>
    </svg>
  );
}

const ATOUTS = [
  "Une sortie de stock en un scan",
  "Des alertes avant la rupture",
  "Des commandes préparées automatiquement",
];

export default function PageConnexion() {
  return (
    <main className="relative flex min-h-screen items-center overflow-hidden bg-odon-nuit px-4 py-12">
      {/* Halo et motif discrets */}
      <div aria-hidden="true" className="pointer-events-none absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-[#00C8E8]/10 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-48 -right-32 h-[560px] w-[560px] rounded-full bg-odon-bleu/60 blur-3xl" />
      <CoinsDeScan className="pointer-events-none absolute -right-24 top-1/2 hidden h-[520px] w-[520px] -translate-y-1/2 text-[#00C8E8]/10 lg:block" />

      <div className="relative mx-auto grid w-full max-w-5xl items-center gap-12 lg:grid-cols-2">
        {/* Présentation */}
        <section className="flex flex-col items-center gap-8 text-center lg:items-start lg:text-left">
          <Logo taille={56} surFondSombre />
          <div className="hidden flex-col gap-6 lg:flex">
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-white">
              La gestion des consommables,
              <br />
              <span className="text-[#00C8E8]">simple comme un scan.</span>
            </h1>
            <ul className="flex flex-col gap-3">
              {ATOUTS.map((atout) => (
                <li key={atout} className="flex items-center gap-3 text-base text-[#C9D6E5]">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#00C8E8]/15">
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden="true">
                      <path d="M5 12l5 5L19 8" fill="none" stroke="#00C8E8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  {atout}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Formulaire */}
        <section className="mx-auto w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl shadow-black/30 sm:p-10">
          <h2 className="text-2xl font-bold text-odon-encre">Connexion</h2>
          <p className="mb-8 mt-1 text-sm text-odon-gris-texte">
            Accédez à l&apos;espace de votre centre
          </p>
          <FormulaireConnexion />
          <p className="mt-8 border-t border-[#EEF1F4] pt-5 text-center text-xs text-odon-gris-texte">
            Accès réservé aux équipes des centres. Mot de passe oublié ? Contactez votre administrateur.
          </p>
        </section>
      </div>
    </main>
  );
}
