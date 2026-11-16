import Coque, { BientotDisponible } from "@/components/coque";

export const metadata = { title: "Notifications · OdonStock" };

export default function Page() {
  return (
    <Coque titre="Notifications">
      <BientotDisponible texte="Les alertes de rupture et de quantité faible." />
    </Coque>
  );
}
