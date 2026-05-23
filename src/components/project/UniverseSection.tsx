import { useState } from "react";
import { LoreGraphView } from "./LoreGraphView";
import { LoreFriseView } from "./LoreFriseView";
import type { Project, Asset } from "@/types";

interface Props {
  project: Project;
  assets: Asset[];
}

export function UniverseSection({ project, assets }: Props) {
  const [tab, setTab] = useState<"connexions" | "frise">("connexions");

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 4rem)" }}>
      {/* Onglets */}
      <div className="flex border-b border-white/10 px-4 shrink-0 bg-black/20">
        {([
          { id: "connexions", label: "🕸 Connexions" },
          { id: "frise",      label: "📅 Frise"       },
        ] as const).map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={[
              "px-5 py-3 text-xs font-semibold uppercase tracking-wide border-b-2 transition-colors duration-150",
              tab === id
                ? "border-amber-400 text-amber-300"
                : "border-transparent text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Contenu */}
      <div className="flex-1 overflow-hidden">
        {tab === "connexions" && <LoreGraphView project={project} assets={assets} />}
        {tab === "frise"      && <LoreFriseView project={project} assets={assets} />}
      </div>
    </div>
  );
}
