// Cloche des notifications : calcule les alertes du centre (côté serveur)
// puis les affiche dans une fenêtre qui s'ouvre au clic.
import { creerClientServeur } from "@/lib/supabase/server";
import { lireProfil } from "@/lib/profil";
import { calculerAlertes } from "@/lib/alertes";
import FenetreNotifications from "./fenetre-notifications";

export default async function Cloche() {
  const profil = await lireProfil();
  if (!profil?.centre_id) return <FenetreNotifications alertes={[]} />;
  const supabase = await creerClientServeur();
  return <FenetreNotifications alertes={await calculerAlertes(supabase, profil.centre_id)} />;
}
