import { Suspense } from "react";
import Link from "next/link";
import Coque, { classesBouton, classesBoutonSecondaire } from "@/components/coque";
import { creerClientServeur } from "@/lib/supabase/server";
import { lireProfil, nomDe, peutGerer } from "@/lib/profil";
import { dateCourteParis, joursDepuis } from "@/lib/format";
import { couleurType, LISTE_STATUTS, STATUTS, type Statut, comparerNumeros, SANS_NUMERO } from "@/lib/rotatifs";
import AjoutRotatif from "./ajout-rotatif";
import { DetailsReparation, Objectif, SelectStatut } from "./elements";
import ActionsLigne from "./actions-ligne";
import SelectFleche from "@/components/select-fleche";

export const metadata = { title: "Rotatifs · OdonStock" };

type Filtres = { type?: string; statut?: string; q?: string };
type Props = { searchParams: Promise<Filtres> };

async function Contenu({ searchParams }: Props) {
  const f = await searchParams;
  const profil = await lireProfil();
  if (!profil?.centre_id) {
    return <p className="rounded-xl bg-[#FEF3C7] px-4 py-3 font-medium text-[#854D0E]">Votre compte n&apos;est rattaché à aucun centre.</p>;
  }
  const modifiable = peutGerer(profil);
  const estAdmin = profil.role === "admin";
  const supabase = await creerClientServeur();
  const recherche = (f.q ?? "").replace(/[,()%*\\]/g, " ").trim();

  const [{ data: types }, { data: tous }, { data: objectifs }, { data: reparations }] = await Promise.all([
    supabase.from("rotatif_types").select("id, nom").order("ordre"),
    supabase.from("rotatifs").select("id, type_id, numero_serie, marque, modele, statut").eq("centre_id", profil.centre_id),
    supabase.from("rotatif_objectifs").select("type_id, objectif").eq("centre_id", profil.centre_id),
    supabase
      .from("reparations")
      .select("id, envoye_le, reparateur, cout, rotatifs!inner(numero_serie, centre_id, rotatif_types(nom))")
      .is("retour_le", null)
      .eq("rotatifs.centre_id", profil.centre_id)
      .order("envoye_le"),
  ]);

  const nomType = new Map((types ?? []).map((t) => [t.id, t.nom as string]));
  const ordreType = new Map((types ?? []).map((t, i) => [t.id, i]));
  const objectifPar = new Map((objectifs ?? []).map((o) => [o.type_id, o.objectif as number]));
  const parc = tous ?? [];

  const cartes = (types ?? []).map((t) => {
    const duType = parc.filter((r) => r.type_id === t.id);
    const n = (s: Statut) => duType.filter((r) => r.statut === s).length;
    const objectif = objectifPar.get(t.id) ?? null;
    const enCirculation = n("circulation");
    return {
      id: t.id,
      nom: t.nom,
      enCirculation,
      panne: n("panne"),
      reparation: n("reparation"),
      reserve: n("reserve"),
      horsService: n("hors_service"),
      objectif,
      tropJuste: objectif != null && enCirculation < objectif,
    };
  });

  const liste = parc
    .filter((r) => !f.type || r.type_id === f.type)
    .filter((r) => !f.statut || r.statut === f.statut)
    .filter((r) => !recherche || (r.numero_serie ?? "").toLowerCase().includes(recherche.toLowerCase()))
    .sort((a, b) => (ordreType.get(a.type_id) ?? 0) - (ordreType.get(b.type_id) ?? 0) || comparerNumeros(a.numero_serie, b.numero_serie));

  const champ = "h-11 rounded-lg border border-[#D5DBE0] bg-white px-3 text-sm text-odon-encre";

  return (
    <div className="flex flex-col gap-6">
      <section aria-label="Rotatifs en circulation par type" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cartes.map((c) => (
          <div key={c.id} className={`flex flex-col gap-3 rounded-xl bg-white p-5 ${c.tropJuste ? "border-2 border-[#F0C3AE]" : "border border-[#E3E7EB]"}`}>
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2.5 text-base font-bold text-odon-encre">
                <span className="h-3 w-3 rounded-full ring-1 ring-black/10" style={{ background: couleurType(c.nom) }} />
                {c.nom}
              </span>
              {c.objectif != null && (
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${c.tropJuste ? "bg-[#FDECE3] text-[#9A3412]" : "bg-[#E3F4EA] text-[#166534]"}`}>
                  {c.tropJuste ? "Parc trop juste" : "Suffisant"}
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-titre text-3xl font-semibold text-odon-nuit">{c.enCirculation}</span>
              <span className="text-sm text-odon-gris-texte">
                en circulation{c.objectif != null ? ` sur ${c.objectif} nécessaires` : ""}
              </span>
            </div>
            {c.objectif != null && c.objectif > 0 && (
              <div className="h-2 overflow-hidden rounded-full bg-[#E6E8EB]" aria-hidden="true">
                <div className={`h-2 rounded-full ${c.tropJuste ? "bg-odon-alerte" : "bg-odon-turquoise"}`} style={{ width: `${Math.min(100, (c.enCirculation / c.objectif) * 100)}%` }} />
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-odon-gris-texte">
              <span>
                {c.reserve > 0 && <strong className="font-semibold text-[#2E4A6B]">{c.reserve} en réserve · </strong>}
                {c.panne} en panne · {c.reparation} en réparation · {c.horsService} hors service
              </span>
              <Objectif typeId={c.id} objectif={c.objectif} modifiable={modifiable} />
            </div>
          </div>
        ))}
      </section>

      <section className="rounded-xl border border-[#E3E7EB] bg-white">
          <form action="/rotatifs" className="flex flex-wrap items-end gap-3 border-b border-[#EEF1F4] p-4">
            <label className="flex flex-col gap-1 text-xs font-semibold text-odon-gris-texte">
              Type
              <SelectFleche name="type" defaultValue={f.type ?? ""} className={champ} largeur="min-w-44">
                <option value="">Tous</option>
                {(types ?? []).map((t) => <option key={t.id} value={t.id}>{t.nom}</option>)}
              </SelectFleche>
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-odon-gris-texte">
              Statut
              <SelectFleche name="statut" defaultValue={f.statut ?? ""} className={champ} largeur="min-w-44">
                <option value="">Tous</option>
                {LISTE_STATUTS.map((s) => <option key={s} value={s}>{STATUTS[s].label}</option>)}
              </SelectFleche>
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-odon-gris-texte">
              N° de série
              <input type="search" name="q" defaultValue={f.q} placeholder="Rechercher…" className={`${champ} w-40`} />
            </label>
            <button type="submit" className={classesBouton}>Filtrer</button>
            {(f.type || f.statut || f.q) && <Link href="/rotatifs" className={classesBoutonSecondaire}>Effacer</Link>}
            <a href="/rotatifs/impression" target="_blank" rel="noopener" className={`${classesBoutonSecondaire} ml-auto`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v7H6z" />
              </svg>
              Imprimer
            </a>
          </form>

          {liste.length === 0 ? (
            <p className="px-6 py-12 text-center text-sm text-odon-gris-texte">
              {parc.length ? "Aucun rotatif ne correspond à ces filtres." : "Aucun rotatif enregistré pour l'instant. Utilisez « Ajouter un rotatif »."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="text-left text-[13px] text-odon-gris-texte">
                    <th scope="col" className="px-5 py-3 font-medium">Rotatif</th>
                    <th scope="col" className="px-3 py-3 font-medium">N° de série</th>
                    <th scope="col" className="px-3 py-3 font-medium">Marque et modèle</th>
                    <th scope="col" className="px-3 py-3 text-right font-medium">Statut</th>
                    {estAdmin && <th scope="col" className="px-5 py-3 text-right font-medium"><span className="sr-only">Actions</span></th>}
                  </tr>
                </thead>
                <tbody>
                  {liste.map((r) => (
                    <tr key={r.id} className="border-t border-[#EEF1F4]">
                      <td className="px-5 py-2.5">
                        <span className="flex items-center gap-2.5 font-medium text-odon-encre">
                          <span className="h-2.5 w-2.5 rounded-full ring-1 ring-black/10" style={{ background: couleurType(nomType.get(r.type_id) ?? "") }} />
                          {nomType.get(r.type_id)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-odon-encre">
                        {r.numero_serie ?? <span className="font-normal italic text-odon-gris-texte">{SANS_NUMERO}</span>}
                      </td>
                      <td className="px-3 py-2.5 text-[#33404B]">{[r.marque, r.modele].filter(Boolean).join(" · ") || "—"}</td>
                      <td className="px-3 py-2.5 text-right">
                        <SelectStatut id={r.id} statut={r.statut as Statut} modifiable={modifiable} />
                      </td>
                      {estAdmin && (
                        <td className="px-5 py-2 text-right">
                          <ActionsLigne
                            rotatif={{ id: r.id, typeId: r.type_id, numeroSerie: r.numero_serie, marque: r.marque, modele: r.modele }}
                            types={(types ?? []).map((t) => ({ id: t.id, nom: t.nom }))}
                          />
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="border-t border-[#EEF1F4] px-5 py-3 text-xs text-odon-gris-texte">
                {liste.length} rotatif{liste.length > 1 ? "s" : ""} affiché{liste.length > 1 ? "s" : ""} sur {parc.length}. Un rotatif est identifié par son type et son numéro de série.
              </p>
            </div>
          )}
      </section>

      <section className="rounded-xl border border-[#E3E7EB] bg-white p-5">
          <h2 className="mb-2 text-base font-semibold text-odon-encre">Réparations en cours</h2>
          {!reparations?.length ? (
            <p className="py-6 text-center text-sm text-odon-gris-texte">Aucun rotatif en réparation.</p>
          ) : (
            reparations.map((rep) => {
              const rot = (Array.isArray(rep.rotatifs) ? rep.rotatifs[0] : rep.rotatifs) as { numero_serie: string | null; rotatif_types: unknown } | undefined;
              const jours = joursDepuis(rep.envoye_le);
              return (
                <div key={rep.id} className="flex flex-col gap-1 border-t border-[#EEF1F4] py-3 first:border-t-0">
                  <span className="text-sm font-semibold text-odon-encre">
                    {nomDe(rot?.rotatif_types) ?? "Rotatif"} · {rot?.numero_serie ? `n° ${rot.numero_serie}` : SANS_NUMERO}
                  </span>
                  <span className="text-xs text-odon-gris-texte">
                    Envoyé le {dateCourteParis(rep.envoye_le)} · depuis {jours} jour{jours > 1 ? "s" : ""}
                  </span>
                  {modifiable && <DetailsReparation id={rep.id} reparateur={rep.reparateur} cout={rep.cout} />}
                </div>
              );
            })
          )}
          <p className="mt-3 rounded-lg bg-odon-gris px-3 py-2.5 text-xs text-odon-gris-texte">
            Passer un rotatif « En réparation » ouvre une fiche ; le remettre « En circulation » la clôture.
          </p>
      </section>
    </div>
  );
}

async function BoutonAjout() {
  const profil = await lireProfil();
  if (!peutGerer(profil)) return null;
  const supabase = await creerClientServeur();
  const { data: types } = await supabase.from("rotatif_types").select("id, nom").order("ordre");
  return <AjoutRotatif types={(types ?? []).map((t) => ({ id: t.id, nom: t.nom }))} />;
}

export default function PageRotatifs({ searchParams }: Props) {
  return (
    <Coque
      titre="Parc de rotatifs"
      sousTitre="Nice Trinité · la traçabilité de stérilisation reste dans Stéricode"
      actions={
        <>
          <Suspense fallback={null}>
            <BoutonAjout />
          </Suspense>
          <a href="/rotatifs/export" className={classesBoutonSecondaire}>Exporter en Excel</a>
        </>
      }
    >
      <Suspense fallback={<p className="text-odon-gris-texte">Chargement…</p>}>
        <Contenu searchParams={searchParams} />
      </Suspense>
    </Coque>
  );
}
