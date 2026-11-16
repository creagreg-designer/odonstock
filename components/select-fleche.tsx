// Liste déroulante avec une flèche dessinée, espacée du bord droit
type Props = React.ComponentProps<"select"> & { largeur?: string };

export default function SelectFleche({ className = "", largeur = "", children, ...props }: Props) {
  return (
    <span className={`relative inline-flex items-center ${largeur}`}>
      <select
        {...props}
        className={`sans-fleche w-full cursor-pointer appearance-none pr-10 ${className}`}
      >
        {children}
      </select>
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="pointer-events-none absolute right-4 text-odon-gris-texte"
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </span>
  );
}
