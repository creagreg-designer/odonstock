// Mise en forme des quantités et des prix.

export function pluriel(mot: string, n: number) {
  if (n <= 1 || /[sxz]$/.test(mot)) return mot;
  return mot.replace(/^(\S+)/, "$1s"); // « boîte » → « boîtes », « sachet stérile » → « sachets stérile »
}

// Le stock est compté en unités de sortie : on l'affiche en unités d'achat + reste.
// Exemple : 17 plaquettes, 5 par boîte → « 3 boîtes et 2 plaquettes ».
export function formaterStock(
  quantite: number,
  sortiesParAchat: number,
  uniteAchat: string,
  uniteSortie: string,
) {
  if (sortiesParAchat <= 1 || uniteAchat === uniteSortie) {
    return `${quantite} ${pluriel(uniteSortie, Math.abs(quantite))}`;
  }
  const signe = quantite < 0 ? "−" : "";
  const q = Math.abs(quantite);
  const achats = Math.floor(q / sortiesParAchat);
  const reste = q % sortiesParAchat;
  const morceaux = [];
  if (achats > 0) morceaux.push(`${achats} ${pluriel(uniteAchat, achats)}`);
  if (reste > 0 || achats === 0) morceaux.push(`${reste} ${pluriel(uniteSortie, reste)}`);
  return signe + morceaux.join(" et ");
}

const EUROS = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
export function formaterPrix(prix: number | null | undefined) {
  return prix == null ? "—" : EUROS.format(Number(prix));
}

// Dates à l'heure de Paris
const FUSEAU = "Europe/Paris";
export function jourParis(date: Date | string) {
  return new Date(date).toLocaleDateString("fr-CA", { timeZone: FUSEAU }); // AAAA-MM-JJ
}
export function heureParis(date: Date | string) {
  return new Date(date).toLocaleTimeString("fr-FR", { timeZone: FUSEAU, hour: "2-digit", minute: "2-digit" });
}
export function dateCourteParis(date: Date | string) {
  return new Date(date).toLocaleDateString("fr-FR", { timeZone: FUSEAU, day: "2-digit", month: "2-digit" });
}

// Nombre de jours écoulés depuis une date (AAAA-MM-JJ ou date complète)
export function joursDepuis(date: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000));
}

// Date et heure du moment, en toutes lettres (pour les documents imprimés)
export function maintenantEnLettres() {
  return new Date().toLocaleString("fr-FR", {
    timeZone: "Europe/Paris",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Mois de la période analysée, du plus ancien au plus récent (clés AAAA-MM, heure de Paris)
export function moisDePeriode(nombre: number) {
  const [annee, mois] = jourParis(new Date()).split("-").map(Number);
  const liste: string[] = [];
  for (let i = nombre - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(annee, mois - 1 - i, 1));
    liste.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  return liste;
}

const MOIS_COURTS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
export function libelleMois(cle: string) {
  const [annee, mois] = cle.split("-").map(Number);
  return `${MOIS_COURTS[mois - 1]} ${String(annee).slice(2)}`;
}
