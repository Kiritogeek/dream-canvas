import { useId } from "react";
import { cn } from "@/lib/utils";

type Props = {
  size?: number;
  className?: string;
};

/** Trois fils dorés qui orbitent autour d'un cœur lumineux. */
export function ArianeOrbitIcon({ size = 36, className }: Props) {
  const uid = useId().replace(/[^a-z0-9]/gi, "a");
  const glowId = `ao-glow-${uid}`;
  const gradId = `ao-grad-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      className={cn("overflow-visible", className)}
      aria-hidden
    >
      <defs>
        <filter id={glowId} x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="1.4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <radialGradient id={gradId} cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#FDE68A" />
          <stop offset="55%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#D97706" />
        </radialGradient>
      </defs>

      {/* Halo doux au centre */}
      <circle cx="18" cy="18" r="5.5" fill="#F59E0B" opacity="0.12" />
      {/* Noyau doré */}
      <circle cx="18" cy="18" r="3" fill={`url(#${gradId})`} filter={`url(#${glowId})`} />

      {/* Fil 1 — sens horaire, rapide */}
      <g>
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 18 18"
          to="360 18 18"
          dur="3s"
          repeatCount="indefinite"
        />
        <path
          d="M 4 18 Q 11 6 18 18 Q 25 30 32 18"
          stroke="#FCD34D"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.85"
        />
        <circle cx="32" cy="18" r="2" fill="#FCD34D" filter={`url(#${glowId})`} />
      </g>

      {/* Fil 2 — anti-horaire, moyen, décalé 120° */}
      <g>
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="120 18 18"
          to="-240 18 18"
          dur="5s"
          repeatCount="indefinite"
        />
        <path
          d="M 5 18 Q 11.5 7 18 18 Q 24.5 29 31 18"
          stroke="#F59E0B"
          strokeWidth="1.1"
          strokeLinecap="round"
          opacity="0.65"
        />
        <circle cx="31" cy="18" r="1.5" fill="#F59E0B" filter={`url(#${glowId})`} />
      </g>

      {/* Fil 3 — sens horaire, lent, décalé 240° */}
      <g>
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="240 18 18"
          to="600 18 18"
          dur="7s"
          repeatCount="indefinite"
        />
        <path
          d="M 6 18 Q 12 8 18 18 Q 24 28 30 18"
          stroke="#D97706"
          strokeWidth="1"
          strokeLinecap="round"
          opacity="0.5"
        />
        <circle cx="30" cy="18" r="1.2" fill="#D97706" />
      </g>
    </svg>
  );
}
