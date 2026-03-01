// ═══════════════════════════════════════════════════════════════
// TextDiff — Comparaison visuelle ancien / nouveau texte
// ═══════════════════════════════════════════════════════════════
//
// Fond rouge doux   → texte supprimé (barré)
// Fond vert/mint doux → texte ajouté
// Couleurs issues de la charte DreamWeave (destructive / mint)

import { cn } from "@/lib/utils";

interface TextDiffProps {
  oldText: string;
  newText: string;
  className?: string;
}

// ── Diff par mots (LCS) ───────────────────────────────────────

type DiffOp = { type: "equal" | "removed" | "added"; text: string };

function tokenize(text: string): string[] {
  // Séparer par mots tout en gardant les espaces / sauts de ligne
  return text.match(/\S+|\s+/g) ?? [];
}

function lcsTable(a: string[], b: string[]): number[][] {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0)
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1] + 1
          : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp;
}

function computeDiff(oldText: string, newText: string): DiffOp[] {
  const a = tokenize(oldText);
  const b = tokenize(newText);
  const dp = lcsTable(a, b);

  const ops: DiffOp[] = [];
  let i = a.length;
  let j = b.length;

  // Backtrack pour produire les opérations
  const stack: DiffOp[] = [];
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      stack.push({ type: "equal", text: a[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      stack.push({ type: "added", text: b[j - 1] });
      j--;
    } else {
      stack.push({ type: "removed", text: a[i - 1] });
      i--;
    }
  }

  // Inverser (on a lu à l'envers)
  stack.reverse();

  // Fusionner les tokens consécutifs de même type
  for (const op of stack) {
    const last = ops[ops.length - 1];
    if (last && last.type === op.type) {
      last.text += op.text;
    } else {
      ops.push({ ...op });
    }
  }

  return ops;
}

// ── Styles inline (fonds plus visibles pour supprimé / ajouté) ─

const removedStyle: React.CSSProperties = {
  backgroundColor: "hsl(var(--destructive) / 0.32)",
  color: "hsl(var(--destructive))",
  textDecoration: "line-through",
  textDecorationColor: "hsl(var(--destructive) / 0.8)",
  borderRadius: "3px",
  padding: "0 3px",
};

const addedStyle: React.CSSProperties = {
  backgroundColor: "hsl(var(--mint) / 0.35)",
  color: "hsl(170 45% 28%)",
  borderRadius: "3px",
  padding: "0 3px",
};

const addedStyleDark: string =
  "dark:text-[hsl(170_40%_75%)]"; // override pour le dark mode

// ── Composant ─────────────────────────────────────────────────

export function TextDiff({ oldText, newText, className }: TextDiffProps) {
  const ops = computeDiff(oldText, newText);

  return (
    <div
      className={cn(
        "text-base leading-relaxed whitespace-pre-wrap",
        className
      )}
    >
      {ops.map((op, i) => {
        if (op.type === "equal") {
          return <span key={i}>{op.text}</span>;
        }
        if (op.type === "removed") {
          return (
            <span key={i} style={removedStyle}>
              {op.text}
            </span>
          );
        }
        // added
        return (
          <span key={i} style={addedStyle} className={addedStyleDark}>
            {op.text}
          </span>
        );
      })}
    </div>
  );
}

// ── Légende ───────────────────────────────────────────────────

export function TextDiffLegend() {
  return (
    <div className="flex items-center gap-4 text-xs text-muted-foreground">
      <div className="flex items-center gap-1.5">
        <span
          className="inline-block w-3.5 h-3.5 rounded-md border"
          style={{
            backgroundColor: "hsl(var(--destructive) / 0.35)",
            borderColor: "hsl(var(--destructive) / 0.5)",
          }}
        />
        <span>Supprimé</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span
          className="inline-block w-3.5 h-3.5 rounded-md border"
          style={{
            backgroundColor: "hsl(var(--mint) / 0.4)",
            borderColor: "hsl(var(--mint) / 0.55)",
          }}
        />
        <span>Ajouté</span>
      </div>
    </div>
  );
}
