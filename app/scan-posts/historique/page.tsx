import { Suspense } from "react";
import Link from "next/link";
import Coque, { classesBouton, classesBoutonSecondaire } from "@/components/coque";
import { creerClientServeur } from "@/lib/supabase/server";
import { lireProfil, nomDe } from "@/lib/profil";
import { dateCourteParis, heureParis } from "@/lib/format";
import BoutonSupprimer from "./bouton-supprimer";

export const metadata = { title: "Historique des scan posts · OdonStock" };

type Filtres = { du?: string; au?: string; personne?: string; taille?: string; type?: string };
type Props = { searchParams: Promise<Filtres> };

const TYPES: Record<string, { label: string; classes: string }> = {
  emprunt: { label: "Emprunt", classes: "bg-[#E6F7FB] text-odon-bleu" },
  retour: { label: "Retour", classes: "bg-[#E3F4EA] text-[#166534]" },
  perte: { label: "Perte", classes: "bg-[#FDECE3] text-[#9A3412]" },
};

const DATE = /^\d{4}-\d{2}-\d{2}$/;

async function Historique({ searchParams }: Props) {
  const f = await searchParams;
  const profil = await lireProfil();
  if (!profil?.centre_id) return null;
  const supabase = await creerClientServeur();

  let requete = supabase
    .from("scan_post_mouvements")
    .select("id, lot_id, type, quantite, cree_le, personne_id, taille_id, personnes(prenom), scan_post_tailles(nom, ordre)")
    .eq("centre_id", profil.centre_id)
    .order("cree_le", { ascending: false })
    .limit(500);
  if (f.du && DATE.test(f.du)) requete = requete.gte("cree_le", `${f.du}T00:00:00+01:00`);
  if (f.au && DATE.test(f.au)) requete = requete.lte("cree_le", `${f.au}T23:59:59+01:00`);
  if (f.personne) requete = requete.eq("personne_id", f.personne);
  if (f.taille) requete = requete.eq("taille_id", f.taille);
  if (f.type && TYPES[f.type]) requete = requete.eq("type", f.type);

  const [{ data: lignes }, { data: personnes }, { data: tailles }] = await Promise.all([
    requete,
    supabase.from("personnes").select("id, prenom").eq("centre_id", profil.centre_id).order("prenom"),
    supabase.from("scan_post_tailles").select("id, nom").eq("centre_id", profil.centre_id).order("ordre"),
  ]);

  // Un emprunt de plusieurs tailles s'affiche sur une seule ligne
  type Mouvement = { cle: string; lot: string; date: string; prenom: string; type: string; detail: string[]; total: number };
  const regroupes = new Map<string, Mouvement>();
  for (const l of lignes ?? []) {
    const cle = `${l.lot_id}-${l.type}`;
    const nomTaille = nomDe(l.scan_post_tailles) ?? "?";
    const prenom = (Array.isArray(l.personnes) ? l.personnes[0] : l.personnes)?.prenom ?? "?";
    const m: Mouvement = regroupes.get(cle) ?? { cle, lot: l.lot_id, date: l.cree_le, prenom, type: l.type, detail: [], total: 0 };
    m.detail.push(`${l.quantite} × ${nomTaille}`);
    m.total += l.quantite;
    regroupes.set(cle, m);
  }
  const mouvements = [...regroupes.values()];
  const estAdmin = profil.role === "admin";
  const compte = (t: string) => mouvements.filter((m) => m.type === t).reduce((n, m) => n + m.total, 0);

  const champ = "h-11 rounded-lg border border-[#D5DBE0] bg-white px-3 text-sm text-odon-encre";
  const etiquette = "flex flex-col gap-1.5 text-xs font-semibold text-odon-gris-texte";

  return (
    <div className="flex flex-col gap-5">
      <form action="/scan-posts/historique" className="flex flex-wrap items-end gap-4 rounded-xl border border-[#E3E7EB] bg-white p-5">
        <label className={etiquette}>Du<input type="date" name="du" defaultValue={f.du} className={champ} /></label>
        <label className={etiquette}>Au<input type="date" name="au" defaultValue={f.au} className={champ} /></label>
        <label className={etiquette}>
          Assistante
          <select name="personne" defaultValue={f.personne ?? ""} className={`${champ} min-w-40`}>
            <option value="">Toutes</option>
            {(personnes ?? []).map((p) => <option key={p.id} value={p.id}>{p.prenom}</option>)}
          </select>
        </label>
        <label className={etiquette}>
          Taille
          <select name="taille" defaultValue={f.taille ?? ""} className={`${champ} min-w-28`}>
            <option value="">Toutes</option>
            {(tailles ?? []).map((t) => <option key={t.id} value={t.id}>{t.nom}</option>)}
          </select>
        </label>
        <label className={etiquette}>
          Mouvement
          <select name="type" defaultValue={f.type ?? ""} className={`${champ} min-w-32`}>
            <option value="">Tous</option>
            <option value="emprunt">Emprunts</option>
            <option value="retour">Retours</option>
            <option value="perte">Pertes</option>
          </select>
        </label>
        <div className="flex gap-2">
          <button type="submit" className={classesBouton}>Filtrer</button>
          <Link href="/scan-posts/historique" className={classesBoutonSecondaire}>Effacer</Link>
        </div>
      </form>

      <section aria-label="Résumé de la sélection" className="grid grid-cols-3 gap-3">
        {[
          { label: "Scan posts empruntés", valeur: compte("emprunt"), alerte: false },
          { label: "Scan posts rendus", valeur: compte("retour"), alerte: false },
          { label: "Scan posts perdus", valeur: compte("perte"), alerte: compte("perte") > 0 },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-[#E3E7EB] bg-white p-4">
            <p className="text-sm font-medium text-odon-gris-texte">{s.label}</p>
            <p className={`mt-1 text-2xl font-bold ${s.alerte ? "text-odon-alerte" : "text-odon-encre"}`}>{s.valeur}</p>
          </div>
        ))}
      </section>

      <section className="rounded-xl border border-[#E3E7EB] bg-white">
        {mouvements.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-odon-gris-texte">Aucun mouvement pour cette sélection.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="text-left text-[13px] text-odon-gris-texte">
                  <th scope="col" className="px-5 py-3 font-medium">Date et heure</th>
                  <th scope="col" className="px-3 py-3 font-medium">Assistante</th>
                  <th scope="col" className="px-3 py-3 font-medium">Mouvement</th>
                  <th scope="col" className="px-5 py-3 font-medium">Scan posts</th>
                  {estAdmin && <th scope="col" className="px-5 py-3 text-right font-medium"><span className="sr-only">Actions</span></th>}
                </tr>
              </thead>
              <tbody>
                {mouvements.map((m) => (
                  <tr key={m.cle} className="border-t border-[#EEF1F4]">
                    <td className="px-5 py-3 text-[#33404B]">{dateCourteParis(m.date)} · {heureParis(m.date)}</td>
                    <td className="px-3 py-3 font-medium text-odon-encre">{m.prenom}</td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${TYPES[m.type]?.classes ?? ""}`}>
                        {TYPES[m.type]?.label ?? m.type}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-odon-encre">{m.detail.join(" · ")}</td>
                    {estAdmin && (
                      <td className="px-5 py-2 text-right">
                        <BoutonSupprimer lotId={m.lot} type={m.type} />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="border-t border-[#EEF1F4] px-5 py-3 text-xs text-odon-gris-texte">
              {mouvements.length} mouvement{mouvements.length > 1 ? "s" : ""}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

export default function PageHistorique({ searchParams }: Props) {
  return (
    <Coque
      titre="Historique des scan posts"
      sousTitre="Tous les emprunts, retours et pertes, conservés sans limite de durée"
      actions={<Link href="/scan-posts" className={classesBoutonSecondaire}>← Scan posts</Link>}
    >
      <Suspense fallback={<p className="text-odon-gris-texte">Chargement…</p>}>
        <Historique searchParams={searchParams} />
      </Suspense>
    </Coque>
  );
}
