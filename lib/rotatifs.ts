// Données partagées du module Rotatifs
export const STATUTS = {
  circulation: { label: "En circulation", classes: "bg-[#E3F4EA] text-[#166534]" },
  reserve: { label: "En réserve", classes: "bg-[#E4ECF5] text-[#2E4A6B]" },
  panne: { label: "En panne", classes: "bg-[#FDECE3] text-[#9A3412]" },
  reparation: { label: "En réparation", classes: "bg-[#FEF3C7] text-[#854D0E]" },
  hors_service: { label: "Hors service", classes: "bg-[#E6E8EB] text-[#33404B]" },
} as const;

export type Statut = keyof typeof STATUTS;
export const LISTE_STATUTS = Object.keys(STATUTS) as Statut[];

// Tri et affichage des numéros de série (facultatifs)
export function comparerNumeros(a: string | null, b: string | null) {
  return (a ?? "").localeCompare(b ?? "", "fr", { numeric: true });
}
export const SANS_NUMERO = "Sans n°";

// Pastille de couleur selon le type (les bagues portent leur couleur)
export function couleurType(nom: string) {
  const n = nom.toLowerCase();
  if (n.includes("rouge")) return "#D33A2C";
  if (n.includes("bleue")) return "#2563EB";
  if (n.includes("verte")) return "#16A34A";
  return "#B8C2CC";
}
