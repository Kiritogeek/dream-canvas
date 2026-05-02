import { useId } from "react";
import { cn } from "@/lib/utils";

type Props = {
  size?: number;
  className?: string;
};

/**
 * Fils dorés animés : chaque fil ondule (morphing sinus CSS) tout en orbitant
 * autour d'un noyau lumineux (animateTransform SVG).
 */
export function ArianeOrbitIcon({ size = 36, className }: Props) {
  const uid = useId().replace(/[^a-z0-9]/gi, "a");
  const glowId = `ao-glow-${uid}`;
  const gradId = `ao-grad-${uid}`;
  const p1 = `ao-p1-${uid}`;
  const p2 = `ao-p2-${uid}`;

  // Sinus 1 période, endpoints fixes à (2,18) et (34,18), amplitude ±11px
  const waveUp   = "M 2 18 C 7 7 11 7 18 18 C 25 29 29 29 34 18";
  const waveDown = "M 2 18 C 7 29 11 29 18 18 C 25 7 29 7 34 18";

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
        <style>{`
          @keyframes ${p1} {
            0%,100% { d: path("${waveUp}"); }
            50%      { d: path("${waveDown}"); }
          }
          @keyframes ${p2} {
            0%,100% { d: path("${waveDown}"); }
            50%      { d: path("${waveUp}"); }
          }
          .${p1} { animation: ${p1} 1.8s ease-in-out infinite; }
          .${p2} { animation: ${p2} 2.4s ease-in-out infinite; }
        `}</style>

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

      {/* Halo + noyau */}
      <circle cx="18" cy="18" r="5.5" fill="#F59E0B" opacity="0.12" />
      <circle cx="18" cy="18" r="3"   fill={`url(#${gradId})`} filter={`url(#${glowId})`} />

      {/* Fil 1 — sens horaire 4s, vague 1.8s */}
      <g>
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 18 18"
          to="360 18 18"
          dur="4s"
          repeatCount="indefinite"
        />
        <path className={p1} d={waveUp}
          stroke="#FCD34D" strokeWidth="1.6" strokeLinecap="round" fill="none" opacity="0.9"
        />
        <circle cx="34" cy="18" r="2.2" fill="#FCD34D" filter={`url(#${glowId})`} />
      </g>

      {/* Fil 2 — anti-horaire 6s, vague inversée 2.4s, décalé 180° */}
      <g>
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="180 18 18"
          to="-180 18 18"
          dur="6s"
          repeatCount="indefinite"
        />
        <path className={p2} d={waveDown}
          stroke="#F59E0B" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.65"
        />
        <circle cx="34" cy="18" r="1.6" fill="#F59E0B" filter={`url(#${glowId})`} />
      </g>
    </svg>
  );
}
