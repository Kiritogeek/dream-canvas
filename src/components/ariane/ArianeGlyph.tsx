import { cn } from "@/lib/utils";

type ArianeGlyphProps = {
  className?: string;
  /** Pulse très léger sur le point central (continuité / alerte). */
  pulse?: boolean;
};

/** Fil + boucle + point central — identité Ariane (Produit/NarraMind-Guide-Personnage.md). */
export function ArianeGlyph({ className, pulse }: ArianeGlyphProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("text-[hsl(var(--lavender))]", className)}
      aria-hidden
    >
      <path
        d="M8 32c8-10 12-18 22-22 6-2.5 10 1 8 6-1.8 5-8 8-14 10"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="opacity-90"
      />
      <path
        d="M28 14c4 2 7 6 6 11-.8 5-6 7-11 5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeDasharray="3 4"
        className="opacity-75"
      />
      <circle
        cx="23"
        cy="24"
        r="3.2"
        fill="hsl(var(--peach))"
        stroke="hsl(var(--peach-deep))"
        strokeWidth="1.2"
        className={cn(pulse && "motion-safe:animate-pulse")}
      />
    </svg>
  );
}
