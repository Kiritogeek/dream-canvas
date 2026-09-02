import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * Symbole de marque DreamWeave : un « W » tissé d'un fil d'or continu (le fil
 * d'Ariane). Les couleurs sont volontairement en dur — ce sont les couleurs de
 * l'identité (le fil est toujours or), pas des tokens d'UI : un logo est un
 * asset de marque figé, comme le favicon.
 */
const W_PATH =
  "M 30 40 C 55 150, 90 185, 118 185 C 150 185, 158 120, 165 95 C 172 70, 182 60, 195 60 C 208 60, 218 70, 225 95 C 232 120, 240 185, 272 185 C 300 185, 335 150, 360 40";
const STAR = "M0 -22 L4.8 -4.8 L22 0 L4.8 4.8 L0 22 L-4.8 4.8 L-22 0 L-4.8 -4.8 Z";
const STAR_SMALL = "M0 -14 L3 -3 L14 0 L3 3 L0 14 L-3 3 L-14 0 L-3 -3 Z";

export type LogoMode = "gradient" | "dark" | "white";

const PALETTE: Record<LogoMode, { stops: [string, string, string]; glow: string; spark: string }> = {
  gradient: { stops: ["#8B6FD6", "#E0895A", "#E0A21C"], glow: "#F6C453", spark: "#F6C453" },
  dark: { stops: ["#D9C7FF", "#F6C9A6", "#FFE9AE"], glow: "#F6C453", spark: "#FFE9AE" },
  white: { stops: ["#ffffff", "#ffffff", "#ffffff"], glow: "#ffffff", spark: "#ffffff" },
};

type LogoMarkProps = {
  className?: string;
  mode?: LogoMode;
  /** Étincelle signature en bout de fil. */
  badge?: boolean;
  /** Fournir un libellé si le symbole n'est pas accompagné du wordmark texte. */
  "aria-label"?: string;
};

export function LogoMark({ className, mode = "gradient", badge = true, "aria-label": ariaLabel }: LogoMarkProps) {
  const uid = useId();
  const gradId = `dw-grad-${uid}`;
  const glowId = `dw-glow-${uid}`;
  const { stops, glow, spark } = PALETTE[mode];
  const isWhite = mode === "white";
  const stroke = isWhite ? "#ffffff" : `url(#${gradId})`;

  return (
    <svg
      viewBox="0 0 390 230"
      className={cn("w-auto overflow-visible", className)}
      fill="none"
      role={ariaLabel ? "img" : undefined}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
      focusable="false"
    >
      <defs>
        {!isWhite && (
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={stops[0]} />
            <stop offset="52%" stopColor={stops[1]} />
            <stop offset="100%" stopColor={stops[2]} />
          </linearGradient>
        )}
        <filter id={glowId} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path d={W_PATH} stroke={glow} strokeWidth={34} strokeLinecap="round" opacity={0.16} filter={`url(#${glowId})`} />
      <path d={W_PATH} stroke={stroke} strokeWidth={17} strokeLinecap="round" filter={`url(#${glowId})`} />
      {badge && (
        <g transform="translate(360 40)">
          <path d={STAR} fill={spark} filter={`url(#${glowId})`} />
        </g>
      )}
      <g transform="translate(30 40)" opacity={0.9}>
        <path d={STAR_SMALL} fill={spark} opacity={0.7} />
      </g>
    </svg>
  );
}
