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
import { ArianeStyleOnboardingCard, ArianeJourneyCompleteCard } from "@/components/ariane";
import {
  ARIANE_ONBOARDING_ADMIN_EMAIL,
  ARIANE_STYLE_ONBOARDING_PENDING_PROJECT_ID_KEY,
  ARIANE_STYLE_ONBOARDING_STORAGE_KEY,
} from "@/constants/ariane";
import { useAuth } from "@/hooks/useAuth";
import { getMaxAccessibleTab, useProgressiveMenuAccess } from "@/hooks/useProgressiveMenuGate";
import { dismissJourneyFinal, isJourneyFinalDismissed } from "@/lib/progressiveOnboardingStorage";

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: project, isLoading: loadingProject } = useProject(id);
  const { data: assets = [], isLoading: loadingAssets } = useAssets(id);
  const { plan: userPlan, usageInfo } = useUserPlan();
  const { user } = useAuth();
  const { isResolved, appliesProgressiveFlow, accessible } = useProgressiveMenuAccess(id);

  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get("tab");
  const activeTab =
    rawTab === "assets" ||
    rawTab === "scenario" ||
    rawTab === "universe" ||
    rawTab === "edition"
      ? rawTab
      : "style";

  const [styleDraft, setStyleDraft] = useState<string | undefined>(undefined);
  const [journeyCompleteOpen, setJourneyCompleteOpen] = useState(false);

  useEffect(() => {
    setStyleDraft(undefined);
  }, [project?.id]);

  useEffect(() => {
    if (activeTab !== "style") setStyleDraft(undefined);
  }, [activeTab]);

  useEffect(() => {
    if (!isResolved || !appliesProgressiveFlow) return;
    const tab = activeTab as keyof typeof accessible;
    if (accessible[tab]) return;
    setSearchParams({ tab: getMaxAccessibleTab(accessible) }, { replace: true });
  }, [isResolved, appliesProgressiveFlow, activeTab, accessible, setSearchParams]);

  useEffect(() => {
    if (!user?.id || !isResolved || !appliesProgressiveFlow) {
      setJourneyCompleteOpen(false);
      return;
    }
    if (activeTab !== "edition") {
      setJourneyCompleteOpen(false);
      return;
    }
    if (!accessible.edition) return;
    if (isJourneyFinalDismissed(user.id)) {
      setJourneyCompleteOpen(false);
      return;
    }
    setJourneyCompleteOpen(true);
  }, [user?.id, isResolved, appliesProgressiveFlow, activeTab, accessible.edition]);

  const styleTemplate = styleDraft ?? project?.style_template ?? "";

  const { generatingAssetId, canGenerate, generate } = useAssetGeneration({
    project: project ?? null,
    userPlan,
    usageInfo,
  });

  const [pendingAssetName, setPendingAssetName] = useState("");
  const [pendingAssetType, setPendingAssetType] = useState<"character" | "background" | "object">("character");
  const [styleOnboardingOpen, setStyleOnboardingOpen] = useState(false);

  useEffect(() => {
    setStyleOnboardingOpen(false);
  }, [project?.id]);

  useEffect(() => {
    if (activeTab !== "style" || !project?.id) return;
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(ARIANE_STYLE_ONBOARDING_STORAGE_KEY) === "1";
    } catch {
      dismissed = false;
    }
    if (dismissed) return;
    try {
      const pendingId = sessionStorage.getItem(ARIANE_STYLE_ONBOARDING_PENDING_PROJECT_ID_KEY);
      if (pendingId === project.id) setStyleOnboardingOpen(true);
    } catch {
      /* ignore */
    }
  }, [activeTab, project?.id]);

  const handleStyleOnboardingDismiss = useCallback(() => {
    try {
      sessionStorage.removeItem(ARIANE_STYLE_ONBOARDING_PENDING_PROJECT_ID_KEY);
      localStorage.setItem(ARIANE_STYLE_ONBOARDING_STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    setStyleOnboardingOpen(false);
  }, []);

  const handleJourneyCompleteFinished = useCallback(() => {
    if (user?.id) dismissJourneyFinal(user.id);
    setJourneyCompleteOpen(false);
  }, [user?.id]);

  const canReplayStyleOnboarding =
    user?.email?.trim().toLowerCase() === ARIANE_ONBOARDING_ADMIN_EMAIL;

  const handleAdminReplayStyleOnboarding = useCallback(() => {
    if (!project?.id) return;
    try {
      sessionStorage.setItem(ARIANE_STYLE_ONBOARDING_PENDING_PROJECT_ID_KEY, project.id);
      localStorage.removeItem(ARIANE_STYLE_ONBOARDING_STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setStyleOnboardingOpen(true);
  }, [project?.id]);

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
      if (isResolved && appliesProgressiveFlow && !accessible.assets) {
        setSearchParams({ tab: getMaxAccessibleTab(accessible) }, { replace: true });
        return;
      }
      setPendingAssetName(name);
      setPendingAssetType(type);
      setSearchParams({ tab: "assets" });
    },
    [setSearchParams, isResolved, appliesProgressiveFlow, accessible]
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
    style: { icon: Palette, title: "Sélection de style" },
    assets: { icon: ImageIcon, title: "Bibliothèque d'assets" },
    scenario: { icon: BookOpen, title: "Scénario" },
    universe: { icon: Globe, title: "Univers" },
    edition: { icon: Layers, title: "Édition" },
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
        onValueChange={(tab) => {
          const t = tab as keyof typeof accessible;
          if (appliesProgressiveFlow && !accessible[t]) return;
          setSearchParams({ tab });
        }}
        className="space-y-4 sm:space-y-6"
      >
        <TabsContent value="style">
          <StyleManager
            project={project}
            styleTemplate={styleTemplate}
            onStyleTemplateChange={setStyleDraft}
            onStyleSaveSuccess={() => setStyleDraft(undefined)}
            onStyleValidated={() =>
              setSearchParams({ tab: appliesProgressiveFlow ? "scenario" : "assets" })
            }
            userPlan={userPlan}
            adminReplayStyleOnboarding={
              canReplayStyleOnboarding ? handleAdminReplayStyleOnboarding : undefined
            }
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
      <ArianeStyleOnboardingCard
        open={styleOnboardingOpen && activeTab === "style"}
        onDismiss={handleStyleOnboardingDismiss}
      />
      <ArianeJourneyCompleteCard
        open={journeyCompleteOpen && activeTab === "edition"}
        onDismiss={handleJourneyCompleteFinished}
      />
    </DashboardLayout>
  );
}
