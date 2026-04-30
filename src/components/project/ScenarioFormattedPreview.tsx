// ═══════════════════════════════════════════════════════════════
// ScenarioFormattedPreview — Lecture formatée du scénario
// Affiche le texte avec :
//   ### Titre  → heading violet gras (sans le ###)
//   > méta     → Lieu en cyan, Personnages en violet (sans le >)
//   «dialogue» → italique
//   Assets     → spans surlignés par type
// ═══════════════════════════════════════════════════════════════

import { useMemo } from "react";
import type { Asset } from "@/types";

// ── Couleurs par type ─────────────────────────────────────────

const ASSET_COLORS: Record<string, { bg: string; border: string }> = {
  character: {
    bg: "hsl(var(--lavender) / 0.3)",
    border: "hsl(var(--lavender) / 0.7)",
  },
  background: {
    bg: "hsl(var(--mint) / 0.25)",
    border: "hsl(var(--mint) / 0.7)",
  },
  object: {
    bg: "hsl(230 55% 88% / 0.35)",
    border: "hsl(230 50% 55% / 0.6)",
  },
};

const DEFAULT_ASSET_COLOR = {
  bg: "hsl(var(--muted) / 0.4)",
  border: "hsl(var(--border))",
};

// ── Tokenisation inline pour le surlignage assets ─────────────

type InlineToken =
  | { kind: "text"; value: string }
  | { kind: "asset"; value: string; asset: Asset };

function tokenizeLineWithAssets(line: string, sortedAssets: Asset[]): InlineToken[] {
  if (sortedAssets.length === 0) return [{ kind: "text", value: line }];

  const tokens: InlineToken[] = [];
  let remaining = line;
  let safetyLimit = 0;

  while (remaining.length > 0 && safetyLimit++ < 2000) {
    let earliest = -1;
    let earliestAsset: Asset | null = null;

    for (const asset of sortedAssets) {
      const name = asset.name.trim();
      if (!name) continue;
      const idx = remaining.toLowerCase().indexOf(name.toLowerCase());
      if (idx !== -1 && (earliest === -1 || idx < earliest)) {
        earliest = idx;
        earliestAsset = asset;
      }
    }

    if (earliest === -1 || !earliestAsset) {
      tokens.push({ kind: "text", value: remaining });
      break;
    }

    if (earliest > 0) {
      tokens.push({ kind: "text", value: remaining.slice(0, earliest) });
    }
    const matchLen = earliestAsset.name.trim().length;
    tokens.push({
      kind: "asset",
      value: remaining.slice(earliest, earliest + matchLen),
      asset: earliestAsset,
    });
    remaining = remaining.slice(earliest + matchLen);
  }

  return tokens;
}

function renderInlineTokens(tokens: InlineToken[]): React.ReactNode[] {
  return tokens.map((tok, i) => {
    if (tok.kind === "text") return <span key={i}>{tok.value}</span>;
    const colors = ASSET_COLORS[tok.asset.asset_type] ?? DEFAULT_ASSET_COLOR;
    return (
      <span
        key={i}
        className="rounded-[4px] font-medium"
        style={{
          backgroundColor: colors.bg,
          borderBottom: `2px solid ${colors.border}`,
          padding: "1px 3px",
        }}
      >
        {tok.value}
      </span>
    );
  });
}

// ── Composant principal ───────────────────────────────────────

interface ScenarioFormattedPreviewProps {
  text: string;
  assets?: Asset[];
  className?: string;
}

export function ScenarioFormattedPreview({
  text,
  assets = [],
  className,
}: ScenarioFormattedPreviewProps) {
  const sortedAssets = useMemo(
    () =>
      [...assets]
        .filter((a) => a.name && a.name.trim().length > 1)
        .sort((a, b) => b.name.length - a.name.length),
    [assets]
  );

  const lines = text.split("\n");

  return (
    <div
      className={`text-sm leading-relaxed space-y-0.5 ${className ?? ""}`}
    >
      {lines.map((line, i) => {
        // --- Heading (### Scène / ### Chapitre)
        const headingMatch = line.match(/^###\s+(.*)/);
        if (headingMatch) {
          const content = headingMatch[1].trim();
          return (
            <p
              key={i}
              className="font-bold pt-3 first:pt-0"
              style={{ color: "hsl(275, 45%, 62%)" }}
            >
              {renderInlineTokens(tokenizeLineWithAssets(content, sortedAssets))}
            </p>
          );
        }

        // --- Blockquote (> Lieu / > Personnages)
        const bqMatch = line.match(/^>\s*(.*)/);
        if (bqMatch) {
          const rest = bqMatch[1].trim();
          const color = /^Personnages\s*:/i.test(rest)
            ? "hsl(275, 38%, 58%)"
            : "hsl(170, 42%, 55%)";
          return (
            <p key={i} className="text-xs" style={{ color }}>
              {renderInlineTokens(tokenizeLineWithAssets(rest, sortedAssets))}
            </p>
          );
        }

        // --- Séparateur ---
        if (/^-{3,}\s*$/.test(line)) {
          return <hr key={i} className="border-border/50 my-2" />;
        }

        // --- Ligne vide
        if (!line.trim()) {
          return <div key={i} className="h-2" />;
        }

        // --- Dialogue «...»
        if (/«/.test(line)) {
          return (
            <p
              key={i}
              className="italic"
              style={{ color: "hsl(275, 22%, 62%)" }}
            >
              {renderInlineTokens(tokenizeLineWithAssets(line, sortedAssets))}
            </p>
          );
        }

        // --- Texte narratif normal
        return (
          <p key={i} className="text-foreground/90">
            {renderInlineTokens(tokenizeLineWithAssets(line, sortedAssets))}
          </p>
        );
      })}
    </div>
  );
}
