import { useState, useCallback, useEffect } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { Palette, Image as ImageIcon, BookOpen, Globe, Layers, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useProject } from "@/hooks/useProjects";
import { useAssets } from "@/hooks/useAssets";
import { useAssetGeneration } from "@/hooks/useAssetGeneration";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useNarraMindAlerts } from "@/hooks/useNarramindAlerts";
import { useScenarioChapters } from "@/hooks/useScenarioChapters";
import DashboardLayout from "@/components/DashboardLayout";
import { AssetLibrary } from "@/components/project/AssetLibrary";
import { StyleManager } from "@/components/project/StyleManager";
import { ScenarioSection } from "@/components/project/ScenarioSection";
import { UniverseSection } from "@/components/project/UniverseSection";
import { EditionSection } from "@/components/project/EditionSection";
import { TestSection } from "@/components/project/TestSection";
import {
  ArianeStyleOnboardingCard,
  ArianeJourneyCompleteCard,
  ArianeTabTourOverlay,
  ArianeThreadIcon,
  ArianeContinuityPanel,
} from "@/components/ariane";
import {
  ARIANE_ONBOARDING_ADMIN_EMAIL,
  ARIANE_PROGRESSIVE_SIDEBAR_BUMP_EVENT,
  ARIANE_STYLE_ONBOARDING_PENDING_PROJECT_ID_KEY,
  ARIANE_STYLE_ONBOARDING_STORAGE_KEY,
} from "@/constants/ariane";
import { useAuth } from "@/hooks/useAuth";
import { getMaxAccessibleTab, useProgressiveMenuAccess } from "@/hooks/useProgressiveMenuGate";
import { ARIANE_TAB_TOUR_BY_STEP } from "@/lib/arianeTabTourSteps";
import {
  clearArianeTabTourCompletion,
  dismissArianeTabTour,
  dismissJourneyFinal,
  dismissMenuNew,
  isArianeTabTourComplete,
  isJourneyFinalDismissed,
  type ProgressiveMenuStep,
} from "@/lib/progressiveOnboardingStorage";

const PROGRESSIVE_TOUR_TABS = ["scenario", "assets", "universe", "edition"] as const;

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: project, isLoading: loadingProject } = useProject(id);
  const { data: assets = [], isLoading: loadingAssets } = useAssets(id);
  const { plan: userPlan, usageInfo } = useUserPlan();
  const { user } = useAuth();
  const { isResolved, appliesProgressiveFlow, accessible } = useProgressiveMenuAccess(id);

  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get("tab");
  const isArianeOnboardingAdmin =
    user?.email?.trim().toLowerCase() === ARIANE_ONBOARDING_ADMIN_EMAIL;
  const activeTab =
    rawTab === "assets" ||
    rawTab === "scenario" ||
    rawTab === "universe" ||
    rawTab === "edition"
      ? rawTab
      : rawTab === "test" && isArianeOnboardingAdmin
        ? "test"
        : "style";

  const [styleDraft, setStyleDraft] = useState<string | undefined>(undefined);
  const [journeyCompleteOpen, setJourneyCompleteOpen] = useState(false);
  const [filArianePanelOpen, setFilArianePanelOpen] = useState(false);

  const { data: allAlerts = [] } = useNarraMindAlerts(id, { statuses: ["active"] });
  const { data: scenarioChapters = [] } = useScenarioChapters(id);

  useEffect(() => {
    setStyleDraft(undefined);
  }, [project?.id]);

  useEffect(() => {
    if (activeTab !== "style") setStyleDraft(undefined);
  }, [activeTab]);

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
    if (
      project?.id &&
      !isArianeTabTourComplete(user.id, project.id, "edition")
    ) {
      setJourneyCompleteOpen(false);
      return;
    }
    if (isJourneyFinalDismissed(user.id)) {
      setJourneyCompleteOpen(false);
      return;
    }
    setJourneyCompleteOpen(true);
  }, [
    user?.id,
    isResolved,
    appliesProgressiveFlow,
    activeTab,
    accessible.edition,
    project?.id,
  ]);

  const styleTemplate = styleDraft ?? project?.style_template ?? "";

  const { generatingAssetId, canGenerate, generate } = useAssetGeneration({
    project: project ?? null,
    userPlan,
    usageInfo,
  });

  const [pendingAssetName, setPendingAssetName] = useState("");
  const [pendingAssetType, setPendingAssetType] = useState<"character" | "background" | "object">("character");
  const [styleOnboardingOpen, setStyleOnboardingOpen] = useState(false);
  const [stickyTourKey, setStickyTourKey] = useState<string | null>(null);

  useEffect(() => {
    setStyleOnboardingOpen(false);
    setStickyTourKey(null);
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

  const handleProgressiveTabTourComplete = useCallback(
    (completedTab: ProgressiveMenuStep) => {
      if (!user?.id || !project?.id) return;
      dismissArianeTabTour(user.id, project.id, completedTab);
      dismissMenuNew(user.id, completedTab);
      window.dispatchEvent(new CustomEvent(ARIANE_PROGRESSIVE_SIDEBAR_BUMP_EVENT));
      setStickyTourKey((cur) =>
        cur === `${project.id}:${completedTab}` ? null : cur
      );
    },
    [user?.id, project?.id]
  );

  const progressiveTourTab: ProgressiveMenuStep | null =
    activeTab !== "style" &&
    PROGRESSIVE_TOUR_TABS.includes(activeTab as (typeof PROGRESSIVE_TOUR_TABS)[number])
      ? (activeTab as ProgressiveMenuStep)
      : null;

  const tabTourSteps = progressiveTourTab ? ARIANE_TAB_TOUR_BY_STEP[progressiveTourTab] : null;

  const tabTourKeyStable =
    project?.id && progressiveTourTab ? `${project.id}:${progressiveTourTab}` : null;

  const tabTourComplete = Boolean(
    user?.id &&
      project?.id &&
      progressiveTourTab &&
      isArianeTabTourComplete(user.id, project.id, progressiveTourTab)
  );

  const eligibleForProgressiveTabTour = Boolean(
    user?.id &&
      project?.id &&
      appliesProgressiveFlow &&
      progressiveTourTab &&
      !!tabTourSteps?.length &&
      accessible[progressiveTourTab] &&
      !tabTourComplete
  );

  useEffect(() => {
    if (!tabTourKeyStable || !progressiveTourTab || !user?.id || !project?.id) return;
    if (tabTourComplete) {
      setStickyTourKey((cur) => (cur === tabTourKeyStable ? null : cur));
      return;
    }
    if (eligibleForProgressiveTabTour) {
      setStickyTourKey(tabTourKeyStable);
    }
  }, [
    tabTourKeyStable,
    tabTourComplete,
    eligibleForProgressiveTabTour,
    progressiveTourTab,
    user?.id,
    project?.id,
  ]);

  const showProgressiveTabTour = Boolean(
    tabTourKeyStable &&
      progressiveTourTab &&
      tabTourSteps?.length &&
      !tabTourComplete &&
      stickyTourKey === tabTourKeyStable
  );

  const canShowAdminTriggerOnboardingButton =
    isArianeOnboardingAdmin &&
    (activeTab === "style" ||
      Boolean(
        progressiveTourTab && appliesProgressiveFlow && accessible[progressiveTourTab]
      ));

  const handleAdminTriggerOnboarding = useCallback(() => {
    if (!user?.id || !project?.id || !isArianeOnboardingAdmin) return;
    if (activeTab === "style") {
      try {
        sessionStorage.setItem(ARIANE_STYLE_ONBOARDING_PENDING_PROJECT_ID_KEY, project.id);
        localStorage.removeItem(ARIANE_STYLE_ONBOARDING_STORAGE_KEY);
      } catch {
        /* ignore */
      }
      setStyleOnboardingOpen(true);
      return;
    }
    const step = progressiveTourTab;
    if (!step || !tabTourKeyStable) return;
    clearArianeTabTourCompletion(user.id, project.id, step);
    setStickyTourKey(tabTourKeyStable);
    window.dispatchEvent(new CustomEvent(ARIANE_PROGRESSIVE_SIDEBAR_BUMP_EVENT));
  }, [
    user?.id,
    project?.id,
    isArianeOnboardingAdmin,
    activeTab,
    progressiveTourTab,
    tabTourKeyStable,
  ]);

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

  const handleNavigateToChapter = useCallback(
    (chapterId: string) => {
      setFilArianePanelOpen(false);
      setSearchParams({ tab: "scenario", focusChapter: chapterId });
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
    style: { icon: Palette, title: "Sélection de style" },
    assets: { icon: ImageIcon, title: "Bibliothèque d'assets" },
    scenario: { icon: BookOpen, title: "Scénario" },
    universe: { icon: Globe, title: "Univers" },
    edition: { icon: Layers, title: "Édition" },
    test: { icon: FlaskConical, title: "Test — Fil d'Ariane" },
  } as const;
  const currentHeader = tabHeaders[activeTab as keyof typeof tabHeaders];
  const HeaderIcon = currentHeader.icon;

  return (
    <DashboardLayout>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 sm:mb-8">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-dream shrink-0">
            <HeaderIcon className="h-4 w-4 text-primary-foreground" />
          </div>
          <h1 className="text-xl sm:text-2xl font-display font-bold truncate">
            {currentHeader.title}
          </h1>
        </div>
        {canShowAdminTriggerOnboardingButton ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-[hsl(var(--lavender)/0.35)] bg-background/50 text-xs shrink-0"
            onClick={handleAdminTriggerOnboarding}
          >
            Déclencher l&apos;onboarding
          </Button>
        ) : null}
      </div>
      <Tabs
        value={activeTab}
        onValueChange={(tab) => {
          if (tab === "test") {
            if (isArianeOnboardingAdmin) setSearchParams({ tab });
            return;
          }
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

        {isArianeOnboardingAdmin && (
          <TabsContent value="test">
            <TestSection projectId={project.id} />
          </TabsContent>
        )}
      </Tabs>
      <ArianeStyleOnboardingCard
        open={styleOnboardingOpen && activeTab === "style"}
        onDismiss={handleStyleOnboardingDismiss}
      />
      <ArianeJourneyCompleteCard
        open={journeyCompleteOpen && activeTab === "edition"}
        onDismiss={handleJourneyCompleteFinished}
      />
      {tabTourSteps && progressiveTourTab ? (
        <ArianeTabTourOverlay
          key={tabTourKeyStable ?? "tour"}
          open={showProgressiveTabTour}
          tabKey={progressiveTourTab}
          onComplete={handleProgressiveTabTourComplete}
        />
      ) : null}
      {/* FAB fil d'Ariane — bulle circulaire bas-droite */}
      {id && allAlerts.length > 0 && (
        <div className="fixed bottom-6 right-6 z-40">
          <button
            type="button"
            onClick={() => setFilArianePanelOpen(true)}
            className="relative h-14 w-14 rounded-full bg-background/95 backdrop-blur-xl border border-amber-500/40 shadow-[0_4px_24px_hsl(38_92%_50%/0.25)] flex items-center justify-center transition-[transform,box-shadow,border-color] duration-200 hover:scale-110 hover:border-amber-500/70 hover:shadow-[0_6px_32px_hsl(38_92%_50%/0.45)] active:scale-95"
            aria-label={`Fil d'Ariane — ${allAlerts.length} point${allAlerts.length > 1 ? "s" : ""} d'attention`}
          >
            <ArianeThreadIcon size={28} pulse />
            <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white tabular-nums ring-2 ring-background">
              {allAlerts.length > 99 ? "99+" : allAlerts.length}
            </span>
          </button>
        </div>
      )}

      <Sheet open={filArianePanelOpen} onOpenChange={setFilArianePanelOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col gap-0 p-4 sm:p-6 overflow-hidden">
          {id && (
            <ArianeContinuityPanel
              projectId={id}
              chapters={scenarioChapters.map((c) => ({
                id: c.id,
                chapter_number: c.chapter_number,
                title: c.title,
              }))}
              onNavigateToChapter={handleNavigateToChapter}
            />
          )}
        </SheetContent>
      </Sheet>
    </DashboardLayout>
  );
}
