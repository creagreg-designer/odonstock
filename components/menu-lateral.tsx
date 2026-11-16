"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "./logo";

const LIENS = [
  { href: "/", label: "Tableau de bord", d: "M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z" },
  { href: "/sortie", label: "Sortie de stock", d: "M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 12h10" },
  { href: "/reception", label: "Réception", d: "M21 8l-9-5-9 5v8l9 5 9-5V8zM3 8l9 5 9-5M12 13v8" },
  { href: "/stock", label: "État du stock", d: "M12 2l9 5-9 5-9-5 9-5zM3 12l9 5 9-5M3 17l9 5 9-5" },
  { href: "/catalogue", label: "Catalogue", d: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5v14zM4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5" },
  { href: "/inventaire", label: "Inventaire", d: "M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 3h6v4H9zM9 14l2 2 4-4" },
  { href: "/scan-posts", label: "Scan posts", d: "M9 3h6v6H9zM10 9h4v8l-2 4-2-4zM10 12.5h4M10 15.5h4" },
  { href: "/rotatifs", label: "Rotatifs", d: "M3 10h11l5-3v10l-5-3H3zM6 10v4M14 7v10" },
  { href: "/commandes", label: "Commandes", d: "M2 3h3l2.7 12.4a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6M9 20h.01M18 20h.01" },
  { href: "/analytique", label: "Analytique", d: "M3 3v18h18M7 15l4-4 3 3 5-6" },
  { href: "/parametres", label: "Paramètres", d: "M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1M15 4v4M9 10v4M17 16v4" },
];

// Les liens lisent l'adresse de la page : isolés dans un Suspense
// pour ne pas bloquer l'affichage du reste de la page.
function LiensActifs() {
  return <Liens chemin={usePathname()} />;
}

function Liens({ chemin }: { chemin: string | null }) {
  const estActif = (href: string) =>
    chemin !== null && (href === "/" ? chemin === "/" : chemin.startsWith(href));
  return (
        <nav aria-label="Menu principal" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 lg:mx-0 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:p-0">
          {LIENS.map((lien) => {
            const actif = estActif(lien.href);
            return (
              <Link
                key={lien.href}
                href={lien.href}
                aria-current={actif ? "page" : undefined}
                className={`flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                  actif
                    ? "bg-[#00C8E8]/15 font-semibold text-[#4FDCF2]"
                    : "font-medium text-[#C9D6E5] hover:bg-white/5 hover:text-white"
                }`}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={lien.d} />
                </svg>
                {lien.label}
              </Link>
            );
          })}
        </nav>
  );
}

export default function MenuLateral({ piedDePage }: { piedDePage: React.ReactNode }) {
  return (
    <aside className="impression-masquee flex w-full flex-col gap-5 bg-odon-nuit px-4 py-5 text-white lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:shrink-0 lg:gap-6 lg:py-6">
      <Link href="/" className="px-2" aria-label="OdonStock, tableau de bord">
        <Logo taille={34} surFondSombre />
      </Link>

      <Suspense fallback={<Liens chemin={null} />}>
        <LiensActifs />
      </Suspense>

      <div className="hidden border-t border-white/10 pt-4 lg:mt-auto lg:block">{piedDePage}</div>
    </aside>
  );
}
