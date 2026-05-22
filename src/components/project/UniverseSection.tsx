import { LoreGraphView } from "./LoreGraphView";
import type { Project, Asset } from "@/types";

interface Props {
  project: Project;
  assets: Asset[];
}

export function UniverseSection({ project, assets }: Props) {
  return <LoreGraphView project={project} assets={assets} />;
}
