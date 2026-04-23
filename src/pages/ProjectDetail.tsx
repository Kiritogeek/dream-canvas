import { useState, useCallback, useEffect } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { Palette, Image as ImageIcon, BookOpen, Globe, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { useProject } from "@/hooks/useProjects";
import { useAssets } from "@/hooks/useAssets";
import { useAssetGeneration } from "@/hooks/useAssetGeneration";
import { useUserPlan } from "@/hooks/useUserPlan";
import DashboardLayout from "@/components/DashboardLayout";
import { AssetLibrary } from "@/components/project/AssetLibrary";
import { StyleManager } from "@/components/project/StyleManager";
import { ScenarioSection } from "@/components/project/ScenarioSection";
import { UniverseSection } from "@/components/project/UniverseSection";
import { EditionSection } from "@/components/project/EditionSection";

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: project, isLoading: loadingProject } = useProject(id);
  const { data: assets = [], isLoading: loadingAssets } = useAssets(id);
  const { plan: userPlan, usageInfo } = useUserPlan();

  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get("tab");
  const activeTab =
    rawTab === "assets" || rawTab === "scenario" || rawTab === "universe" || rawTab === "edition"
      ? rawTab
      : "style";

  const [styleDraft, setStyleDraft] = useState<string | undefined>(undefined);

  useEffect(() => {
    setStyleDraft(undefined);
  }, [project?.id]);

  useEffect(() => {
    if (activeTab !== "style") setStyleDraft(undefined);
  }, [activeTab]);

  const styleTemplate = styleDraft ?? project?.style_template ?? "";

  const { generatingAssetId, canGenerate, generate } = useAssetGeneration({
    project: project ?? null,
    userPlan,
    usageInfo,
  });

  const [pendingAssetName, setPendingAssetName] = useState("");
  const [pendingAssetType, setPendingAssetType] = useState<"character" | "background" | "object">("character");

  useEffect(() => {
    const name = searchParams.get("pendingName");
    const type = searchParams.get("pendingType") as "character" | "background" | "object" | null;
    if (name) {
      setPendingAssetName(name);
      if (type && ["character", "background", "object"].includes(type)) setPendingAssetType(type);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete("pendingName");
        next.delete("pendingType");
        return next;
      }, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleNavigateToCreateAsset = useCallback(
    (name: string, type: "character" | "background" | "object") => {
      setPendingAssetName(name);
      setPendingAssetType(type);
      setSearchParams({ tab: "assets" });
    },
    [setSearchParams]
  );

  const loading = loadingProject || loadingAssets;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass rounded-xl h-32 animate-pulse" />
          ))}
        </div>
      </DashboardLayout>
    );
  }

  if (!project) {
    return (
      <DashboardLayout>
        <div className="glass rounded-2xl p-16 text-center">
          <p className="text-muted-foreground">Projet introuvable.</p>
          <Button asChild variant="ghost" className="mt-4">
            <Link to="/dashboard/projects">Retour aux projets</Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const tabHeaders = {
    style:    { icon: Palette,   title: "Sélection de style"    },
    assets:   { icon: ImageIcon, title: "Bibliothèque d'assets" },
    scenario: { icon: BookOpen,  title: "Scénario"              },
    universe: { icon: Globe,     title: "Univers"               },
    edition:  { icon: Layers,    title: "Édition"               },
  } as const;
  const currentHeader = tabHeaders[activeTab as keyof typeof tabHeaders];
  const HeaderIcon = currentHeader.icon;

  return (
    <DashboardLayout>
      <div className="flex items-center gap-3 mb-6 sm:mb-8">
        <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-dream shrink-0">
          <HeaderIcon className="h-4 w-4 text-primary-foreground" />
        </div>
        <h1 className="text-xl sm:text-2xl font-display font-bold">{currentHeader.title}</h1>
      </div>
      <Tabs
        value={activeTab}
        onValueChange={(tab) => setSearchParams({ tab })}
        className="space-y-4 sm:space-y-6"
      >
        <TabsContent value="style">
          <StyleManager
            project={project}
            styleTemplate={styleTemplate}
            onStyleTemplateChange={setStyleDraft}
            onStyleSaveSuccess={() => setStyleDraft(undefined)}
            onStyleValidated={() => setSearchParams({ tab: "assets" })}
            userPlan={userPlan}
          />
        </TabsContent>

        <TabsContent value="assets">
          <AssetLibrary
            projectId={project.id}
            project={project}
            assets={assets}
            generatingAssetId={generatingAssetId}
            onCanGenerate={canGenerate}
            onGenerate={generate}
            pendingAssetName={pendingAssetName}
            pendingAssetType={pendingAssetType}
            onPendingAssetConsumed={() => setPendingAssetName("")}
          />
        </TabsContent>

        <TabsContent value="scenario">
          <ScenarioSection
            projectId={project.id}
            project={project}
            onNavigateToCreateAsset={handleNavigateToCreateAsset}
          />
        </TabsContent>

        <TabsContent value="universe">
          <UniverseSection project={project} assets={assets} />
        </TabsContent>

        <TabsContent value="edition">
          <EditionSection projectId={project.id} />
        </TabsContent>

      </Tabs>
    </DashboardLayout>
  );
}
