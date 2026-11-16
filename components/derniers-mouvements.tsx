// Derniers mouvements de stock du centre (sorties ou entrées)
import { creerClientServeur } from "@/lib/supabase/server";
import { lireProfil, nomDe } from "@/lib/profil";
import { dateCourteParis, heureParis, jourParis, pluriel } from "@/lib/format";

export default async function DerniersMouvements({ type, titre }: { type: "sortie" | "entree"; titre: string }) {
  const profil = await lireProfil();
  if (!profil?.centre_id) return null;
  const supabase = await creerClientServeur();
  const { data } = await supabase
    .from("mouvements")
    .select("id, quantite, cree_le, lieux(nom), produits(nom, unite_sortie)")
    .eq("centre_id", profil.centre_id)
    .eq("type", type)
    .order("cree_le", { ascending: false })
    .limit(15);
  const aujourdhui = jourParis(new Date().toISOString());

  return (
    <section className="rounded-xl border border-[#E3E7EB] bg-white p-5">
      <h2 className="mb-2 text-base font-semibold text-odon-encre">{titre}</h2>
      {!data?.length ? (
        <p className="py-6 text-center text-sm text-odon-gris-texte">Aucun mouvement pour l&apos;instant.</p>
      ) : (
        <ul>
          {data.map((m) => {
            const p = (Array.isArray(m.produits) ? m.produits[0] : m.produits) as { nom: string; unite_sortie: string } | undefined;
            const quand = jourParis(m.cree_le) === aujourdhui ? heureParis(m.cree_le) : `${dateCourteParis(m.cree_le)} · ${heureParis(m.cree_le)}`;
            return (
              <li key={m.id} className="flex items-center justify-between gap-3 border-t border-[#EEF1F4] py-2.5 first:border-t-0">
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-semibold text-odon-encre">{p?.nom}</span>
                  <span className="text-xs text-odon-gris-texte">
                    {m.quantite} {pluriel(p?.unite_sortie ?? "unité", m.quantite)}
                    {type === "sortie" ? ` · ${nomDe(m.lieux) ?? "—"}` : ""}
                  </span>
                </span>
                <span className="shrink-0 text-xs text-odon-gris-texte">{quand}</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
