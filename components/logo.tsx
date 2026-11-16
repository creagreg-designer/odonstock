// Logo OdonStock : la boîte encadrée par les coins de scan.
type Props = { taille?: number; surFondSombre?: boolean };

export default function Logo({ taille = 36, surFondSombre = false }: Props) {
  const boite = surFondSombre ? "#FFFFFF" : "#00386D";
  const fond = surFondSombre ? "#0A2346" : "#FFFFFF";
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg width={taille} height={taille} viewBox="0 0 40 40" aria-hidden="true">
        <g fill="none" stroke="#00C8E8" strokeWidth="3.5" strokeLinecap="round">
          <path d="M4 12V9a5 5 0 0 1 5-5h3" />
          <path d="M28 4h3a5 5 0 0 1 5 5v3" />
          <path d="M36 28v3a5 5 0 0 1-5 5h-3" />
          <path d="M12 36H9a5 5 0 0 1-5-5v-3" />
        </g>
        <g fill={boite}>
          <polygon points="20,9 30,14 20,19 10,14" />
          <polygon points="10,16 19,21 19,31 10,26" />
          <polygon points="21,21 30,16 30,26 21,31" />
        </g>
        <path d="M15 11.5L25 16.5" stroke={fond} strokeWidth="1.6" />
      </svg>
      <span className="font-bold tracking-tight" style={{ fontSize: taille * 0.6 }}>
        <span style={{ color: surFondSombre ? "#FFFFFF" : "#00386D" }}>Odon</span>
        <span style={{ color: surFondSombre ? "#00C8E8" : "#00A6C6" }}>Stock</span>
      </span>
    </span>
  );
}
