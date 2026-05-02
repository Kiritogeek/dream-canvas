import { cn } from "@/lib/utils";

type ArianeThreadIconProps = {
  size?: number;
  className?: string;
  pulse?: boolean;
  alertCount?: number;
};

export function ArianeThreadIcon({
  size = 24,
  className,
  pulse = false,
  alertCount,
}: ArianeThreadIconProps) {
  const showBadge = typeof alertCount === "number" && alertCount > 0;
  const badgeLabel = alertCount && alertCount > 99 ? "99+" : String(alertCount ?? 0);

  return (
    <span className={cn("relative inline-flex shrink-0", className)} style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <defs>
          <radialGradient id="ariane-ball-grad" cx="38%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#FCD34D" />
            <stop offset="55%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#D97706" />
          </radialGradient>
          <radialGradient id="ariane-highlight" cx="32%" cy="28%" r="40%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </radialGradient>
          <filter id="ariane-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Glow ring */}
        {pulse && (
          <circle
            cx="10"
            cy="13"
            r="7.5"
            fill="#F59E0B"
            opacity="0.18"
            className="motion-safe:animate-pulse"
          />
        )}

        {/* Main ball */}
        <circle cx="10" cy="13" r="6.5" fill="url(#ariane-ball-grad)" filter="url(#ariane-glow)" />

        {/* Highlight */}
        <circle cx="10" cy="13" r="6.5" fill="url(#ariane-highlight)" />

        {/* Wound thread arcs */}
        <path
          d="M5.5 11.5 Q10 8.5 14 11"
          stroke="#92400E"
          strokeWidth="1"
          strokeLinecap="round"
          fill="none"
          opacity="0.4"
        />
        <path
          d="M5 13.5 Q10 11 15 13.5"
          stroke="#92400E"
          strokeWidth="1"
          strokeLinecap="round"
          fill="none"
          opacity="0.35"
        />
        <path
          d="M5.5 15.5 Q10 13.5 14 15.5"
          stroke="#92400E"
          strokeWidth="1"
          strokeLinecap="round"
          fill="none"
          opacity="0.3"
        />

        {/* Free thread trailing from ball */}
        <path
          d="M16 10.5 C18 9 20 10 21.5 8.5"
          stroke="#F59E0B"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
        />
      </svg>

      {showBadge && (
        <span
          className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[hsl(var(--destructive))] px-0.5 text-[9px] font-bold leading-none text-white tabular-nums pointer-events-none"
          aria-hidden
        >
          {badgeLabel}
        </span>
      )}
    </span>
  );
}
