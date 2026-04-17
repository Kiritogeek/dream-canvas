import { BarChart2 } from "lucide-react";
import {
  estimatePanelCount,
  PANELS_REFERENCE_MIN,
  PANELS_REFERENCE_MAX,
} from "@/services/panels";

interface PanelCountBadgeProps {
  content: string | null | undefined;
  panelsTarget?: number | null;
  actualCount?: number;
  variant?: "scenario" | "editor";
}

function getEstimateColor(estimate: number): string {
  if (estimate === 0) return "text-muted-foreground";
  if (estimate >= PANELS_REFERENCE_MIN && estimate <= PANELS_REFERENCE_MAX)
    return "text-emerald-500";
  return "text-amber-500";
}

export function PanelCountBadge({
  content,
  panelsTarget,
  actualCount,
  variant = "scenario",
}: PanelCountBadgeProps) {
  const estimate = estimatePanelCount(content);
  const target = panelsTarget ?? PANELS_REFERENCE_MAX;
  const fillMax = Math.max(target, PANELS_REFERENCE_MAX);
  const fillPct = Math.min(100, fillMax > 0 ? (estimate / fillMax) * 100 : 0);
  const estimateColor = getEstimateColor(estimate);

  if (variant === "editor") {
    return (
      <p className="text-xs text-muted-foreground">
        {actualCount !== undefined && (
          <>
            <span className="font-medium text-foreground">
              {actualCount}
            </span>{" "}
            panel{actualCount > 1 ? "s" : ""} créé{actualCount > 1 ? "s" : ""}
            {" · "}
          </>
        )}
        Estimation texte :{" "}
        <span className={`font-medium ${estimateColor}`}>~{estimate}</span>
        {" · "}
        Typique :{" "}
        <span className="font-medium text-foreground">
          {PANELS_REFERENCE_MIN}–{PANELS_REFERENCE_MAX}
        </span>
      </p>
    );
  }

  return (
    <div className="bg-primary/5 border border-primary/15 rounded-lg px-3 py-2 space-y-1.5">
      <div className="flex items-center gap-1.5 text-xs">
        <BarChart2 className="h-3.5 w-3.5 text-primary shrink-0" />
        <span className="text-muted-foreground">Estimation :</span>
        <span className={`font-semibold ${estimateColor}`}>~{estimate} panels</span>
        <span className="text-muted-foreground">·</span>
        <span className="text-muted-foreground">
          Typique :{" "}
          <span className="font-medium text-foreground">
            {PANELS_REFERENCE_MIN}–{PANELS_REFERENCE_MAX}
          </span>
        </span>
        {panelsTarget != null && (
          <>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">
              Cible :{" "}
              <span className="font-medium text-foreground">{panelsTarget}</span>
            </span>
          </>
        )}
      </div>
      <div className="w-full h-1.5 rounded-full bg-primary/20 overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${fillPct}%` }}
        />
      </div>
    </div>
  );
}
