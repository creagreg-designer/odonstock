// Graphiques simples, sans bibliothèque : une seule couleur par série, valeur au survol
type Point = { cle: string; libelle: string; valeur: number; texte: string };

// Barres verticales (évolution mois par mois). Le dernier mois, en cours, est plus clair.
export function Colonnes({ points, titre, enCours = true }: { points: Point[]; titre: string; enCours?: boolean }) {
  const max = Math.max(1, ...points.map((p) => p.valeur));
  return (
    <figure className="flex flex-col gap-2" aria-label={titre}>
      <div className="flex h-56 items-end gap-2 border-b border-[#D5DBE0] px-1 sm:gap-3" role="list">
        {points.map((p, i) => {
          const dernier = enCours && i === points.length - 1;
          return (
            <div key={p.cle} role="listitem" className="group relative flex h-full flex-1 flex-col items-center justify-end" title={`${p.libelle} : ${p.texte}`}>
              <span className="mb-1 text-[11px] font-semibold text-odon-gris-texte opacity-0 transition group-hover:opacity-100">{p.texte}</span>
              <div
                className={`w-full max-w-12 rounded-t-[4px] transition ${dernier ? "bg-odon-turquoise/45" : "bg-odon-turquoise"} group-hover:bg-odon-bleu`}
                style={{ height: `${p.valeur > 0 ? Math.max(2, (p.valeur / max) * 88) : 0}%` }}
              />
              <span className="sr-only">{p.libelle} : {p.texte}</span>
            </div>
          );
        })}
      </div>
      <div className="flex gap-2 px-1 sm:gap-3" aria-hidden="true">
        {points.map((p) => (
          <span key={p.cle} className="flex-1 text-center text-[11px] text-odon-gris-texte">{p.libelle}</span>
        ))}
      </div>
    </figure>
  );
}

// Barres horizontales (comparaison entre catégories, cabinets…)
export function Barres({ points, vide }: { points: Point[]; vide: string }) {
  const max = Math.max(1, ...points.map((p) => p.valeur));
  if (!points.length) return <p className="py-6 text-center text-sm text-odon-gris-texte">{vide}</p>;
  return (
    <ul className="flex flex-col gap-3">
      {points.map((p) => (
        <li key={p.cle} className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)_auto] items-center gap-3" title={`${p.libelle} : ${p.texte}`}>
          <span className="truncate text-sm text-[#33404B]">{p.libelle}</span>
          <span className="h-2.5 overflow-hidden rounded-full bg-[#E6E8EB]">
            <span className="block h-2.5 rounded-full bg-odon-turquoise" style={{ width: `${(p.valeur / max) * 100}%` }} />
          </span>
          <span className="text-right text-sm font-semibold text-odon-encre">{p.texte}</span>
        </li>
      ))}
    </ul>
  );
}
