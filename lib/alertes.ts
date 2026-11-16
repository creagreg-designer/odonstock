// Calcul des alertes de stock d'un centre : ruptures et quantités sous le seuil.
import type { SupabaseClient } from "@supabase/supabase-js";
import { formaterStock } from "./format";
import type { Alerte } from "@/components/fenetre-notifications";

type Produit = { id: string; nom: string; unite_achat: string; unite_sortie: string; sorties_par_achat: number; actif: boolean };

export async function calculerAlertes(supabase: SupabaseClient, centreId: string): Promise<Alerte[]> {
  const { data } = await supabase
    .from("stocks")
    .select("quantite, seuil_manuel, seuil_auto, seuil_automatique, produits(id, nom, unite_achat, unite_sortie, sorties_par_achat, actif)")
    .eq("centre_id", centreId);

  const alertes: Alerte[] = [];
  for (const s of data ?? []) {
    const p = (Array.isArray(s.produits) ? s.produits[0] : s.produits) as Produit | undefined;
    if (!p || !p.actif) continue;
    const seuil = s.seuil_automatique ? s.seuil_auto : s.seuil_manuel;
    if (s.quantite <= 0) {
      alertes.push({ id: p.id, type: "rupture", produit: p.nom, detail: "Plus rien en stock" });
    } else if (seuil != null && s.quantite <= seuil) {
      const reste = formaterStock(s.quantite, p.sorties_par_achat, p.unite_achat, p.unite_sortie);
      const seuilTexte = formaterStock(seuil, p.sorties_par_achat, p.unite_achat, p.unite_sortie);
      alertes.push({ id: p.id, type: "faible", produit: p.nom, detail: `Reste ${reste} · seuil ${seuilTexte}` });
    }
  }
  return alertes.sort((a, b) =>
    a.type === b.type ? a.produit.localeCompare(b.produit, "fr") : a.type === "rupture" ? -1 : 1,
  );
}
