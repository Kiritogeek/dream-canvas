import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ARIANE_DISPLAY_NAME } from "@/constants/ariane";
import { ArianeGlyph } from "./ArianeGlyph";

export type ArianeBubbleVariant = "onboarding" | "continuity";

type ArianeBubbleProps = {
  variant: ArianeBubbleVariant;
  children: ReactNode;
  className?: string;
  /** Légende sous le nom (optionnel). */
  caption?: string;
  /** ID pour aria-labelledby si besoin. */
  titleId?: string;
};

export function ArianeBubble({
  variant,
  children,
  className,
  caption,
  titleId,
}: ArianeBubbleProps) {
  const isContinuity = variant === "continuity";
  return (
    <article
      className={cn(
        "glass rounded-2xl border shadow-[var(--glass-shadow)] p-4 sm:p-5",
        isContinuity
          ? "border-[hsl(var(--peach-deep)/0.35)] bg-card/85"
          : "border-[hsl(var(--lavender)/0.3)] bg-[hsl(var(--content-area)/0.95)]",
        className
      )}
      aria-labelledby={titleId}
    >
      <div className="flex gap-3 sm:gap-4">
        <ArianeGlyph
          className="h-10 w-10 sm:h-11 sm:w-11 shrink-0 mt-0.5"
          pulse={isContinuity}
        />
        <div className="min-w-0 flex-1 space-y-2 text-sm leading-relaxed text-foreground/95">
          {children}
        </div>
      </div>
      <div className="mt-4 pt-3 border-t border-border/40 flex flex-col items-end gap-0.5">
        <span className="font-display text-sm font-semibold text-[hsl(var(--lavender))]">
          {ARIANE_DISPLAY_NAME}
        </span>
        {caption ? (
          <span className="text-[11px] text-muted-foreground">{caption}</span>
        ) : null}
      </div>
    </article>
  );
}
