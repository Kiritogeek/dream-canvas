import { useState, useCallback, useEffect } from "react";
import { QuotaReachedDialog } from "@/components/shared/QuotaReachedDialog";
import { useParams, useSearchParams, Link, useNavigate } from "react-router-dom";
import { Palette, Image as ImageIcon, BookOpen, Globe, Layers, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useProject } from "@/hooks/useProjects";
import { useAssets } from "@/hooks/useAssets";
import { useChapters } from "@/hooks/useChapters";
import { useAssetGeneration } from "@/hooks/useAssetGeneration";
import { clearAssetNotif, subscribeToGenerationEvents } from "@/lib/generationPending";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useNarraMindAlerts } from "@/hooks/useNarramindAlerts";
import { useNarramindMissingAssets } from "@/hooks/useNarramindMissingAssets";
import type { AssetType } from "@/types";
import { TIER_CONFIG } from "@/types";
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
  ArianeOrbitIcon,
  ArianeContinuityPanel,
} from "@/components/ariane";
import {
  ARIANE_FORCED_PROGRESSIVE_PENDING,
  ARIANE_FORCED_PROGRESSIVE_PROJECT_SESSION_KEY,
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
  const navigate = useNavigate();
  const { data: project, isLoading: loadingProject } = useProject(id);
  const { data: assets = [], isLoading: loadingAssets } = useAssets(id);
  useChapters(id);
  const { plan: userPlan, usageInfo, nextResetDate } = useUserPlan();
  const { user } = useAuth();
  // Clé par utilisateur — même logique que l'onboarding bienvenue
  const styleOnboardingKey = user?.id
    ? `${ARIANE_STYLE_ONBOARDING_STORAGE_KEY}_${user.id}`
    : null;
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

  // Redirige vers edition si onboarding terminé — URL = source de vérité (sidebar + contenu sync)
  useEffect(() => {
    if (!user?.id || rawTab) return;
    // Cas rapide : journey final déjà posé (requiert seulement l'auth)
    if (isJourneyFinalDismissed(user.id)) {
      setSearchParams({ tab: "edition" }, { replace: true });
      return;
    }
    // Cas vétéran multi-projets : ne pas rediriger si la simulation est en attente
    const simKey =
      typeof window !== "undefined"
        ? sessionStorage.getItem(ARIANE_FORCED_PROGRESSIVE_PROJECT_SESSION_KEY)
        : null;
    if (simKey === ARIANE_FORCED_PROGRESSIVE_PENDING) return;
    if (!isResolved || appliesProgressiveFlow) return;
    dismissJourneyFinal(user.id);
    setSearchParams({ tab: "edition" }, { replace: true });
  }, [user?.id, rawTab, isResolved, appliesProgressiveFlow, setSearchParams]);

  const [styleDraft, setStyleDraft] = useState<string | undefined>(undefined);
  const [journeyCompleteOpen, setJourneyCompleteOpen] = useState(false);
  const [filArianePanelOpen, setFilArianePanelOpen] = useState(false);
  const [showQuotaModal, setShowQuotaModal] = useState(false);

  const { data: allAlerts = [] } = useNarraMindAlerts(id, { statuses: ["active"] });
  const { data: allMissingAssets = [] } = useNarramindMissingAssets(id);

  useEffect(() => {
    if (filArianePanelOpen && allAlerts.length === 0 && allMissingAssets.length === 0) {
      setFilArianePanelOpen(false);
    }
  }, [allAlerts.length, allMissingAssets.length, filArianePanelOpen]);
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
    onQuotaReached: () => setShowQuotaModal(true),
  });

  const [pendingAssetName, setPendingAssetName] = useState("");
  const [pendingAssetType, setPendingAssetType] = useState<AssetType | undefined>(undefined);
  const [styleOnboardingOpen, setStyleOnboardingOpen] = useState(false);
  const [stickyTourKey, setStickyTourKey] = useState<string | null>(null);

  useEffect(() => {
    setStyleOnboardingOpen(false);
    setStickyTourKey(null);
  }, [project?.id]);

  useEffect(() => {
    if (activeTab !== "assets" || !id) return;
    clearAssetNotif(id);
    return subscribeToGenerationEvents(() => clearAssetNotif(id));
  }, [activeTab, id]);

  useEffect(() => {
    if (activeTab !== "style" || !project?.id || !styleOnboardingKey) return;
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(styleOnboardingKey) === "1";
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
  }, [activeTab, project?.id, styleOnboardingKey]);

  const handleStyleOnboardingDismiss = useCallback(() => {
    try {
      sessionStorage.removeItem(ARIANE_STYLE_ONBOARDING_PENDING_PROJECT_ID_KEY);
      if (styleOnboardingKey) localStorage.setItem(styleOnboardingKey, "1");
    } catch {
      /* ignore */
    }
    setStyleOnboardingOpen(false);
    window.dispatchEvent(new CustomEvent(ARIANE_PROGRESSIVE_SIDEBAR_BUMP_EVENT));
  }, [styleOnboardingKey]);

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
      PROGRESSIVE_TOUR_TABS.includes(activeTab as (typeof PROGRESSIVE_TOUR_TABS)[number]));

  const handleAdminTriggerOnboarding = useCallback(() => {
    if (!user?.id || !project?.id || !isArianeOnboardingAdmin) return;
    if (activeTab === "style") {
      try {
        sessionStorage.setItem(ARIANE_STYLE_ONBOARDING_PENDING_PROJECT_ID_KEY, project.id);
        if (styleOnboardingKey) localStorage.removeItem(styleOnboardingKey);
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
    styleOnboardingKey,
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
    (name: string, type: AssetType) => {
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

  const handleCreateMissingAsset = useCallback(
    (name: string) => {
      if (isResolved && appliesProgressiveFlow && !accessible.assets) {
        setSearchParams({ tab: getMaxAccessibleTab(accessible) }, { replace: true });
        return;
      }
      setFilArianePanelOpen(false);
      setPendingAssetName(name);
      setPendingAssetType(undefined);
      setSearchParams({ tab: "assets" });
    },
    [setSearchParams, isResolved, appliesProgressiveFlow, accessible]
  );

  const handleNavigateToChapter = useCallback(
    (chapterId: string, anchor?: string) => {
      setFilArianePanelOpen(false);
      const search = anchor ? `?highlight=${encodeURIComponent(anchor)}` : "";
      navigate(`/dashboard/projects/${id}/scenario/${chapterId}${search}`);
    },
    [id, navigate]
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
      {/* FAB fil d'Ariane — fils orbitaux autour du bouton */}
      {id && (allAlerts.length > 0 || allMissingAssets.length > 0) && (
        <div className="fixed bottom-6 right-6 z-40">
          <div className="relative">
            {/* Fils ondulants qui orbitent autour du bouton 64px — SVG 84×84, centre à 42,42 */}
            <svg
              width="84"
              height="84"
              viewBox="0 0 84 84"
              fill="none"
              className="absolute -top-[10px] -left-[10px] pointer-events-none overflow-visible"
              aria-hidden
            >
              <defs>
                <style>{`
                  @keyframes ariane-fab-w1 {
                    0%,100% { d: path("M 8 42 C 21 28 28 28 42 42 C 56 56 63 56 76 42"); }
                    50%     { d: path("M 8 42 C 21 56 28 56 42 42 C 56 28 63 28 76 42"); }
                  }
                  @keyframes ariane-fab-w2 {
                    0%,100% { d: path("M 9 42 C 22 56 29 56 42 42 C 55 28 62 28 75 42"); }
                    50%     { d: path("M 9 42 C 22 28 29 28 42 42 C 55 56 62 56 75 42"); }
                  }
                  .ariane-fab-p1 { animation: ariane-fab-w1 2s ease-in-out infinite; }
                  .ariane-fab-p2 { animation: ariane-fab-w2 2.8s ease-in-out infinite; }
                `}</style>
                <filter id="ariane-fab-glow" x="-80%" y="-80%" width="260%" height="260%">
                  <feGaussianBlur stdDeviation="1.8" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              {/* Fil 1 — sens horaire 4.5s, vague 2s */}
              <g>
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  from="0 42 42"
                  to="360 42 42"
                  dur="4.5s"
                  repeatCount="indefinite"
                />
                <path
                  className="ariane-fab-p1"
                  d="M 8 42 C 21 28 28 28 42 42 C 56 56 63 56 76 42"
                  stroke="#FCD34D"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  fill="none"
                  opacity="0.7"
                />
                <circle cx="76" cy="42" r="2.8" fill="#FCD34D" filter="url(#ariane-fab-glow)" />
              </g>
              {/* Fil 2 — anti-horaire 7s, vague inversée 2.8s, décalé 180° */}
              <g>
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  from="180 42 42"
                  to="-180 42 42"
                  dur="7s"
                  repeatCount="indefinite"
                />
                <path
                  className="ariane-fab-p2"
                  d="M 9 42 C 22 56 29 56 42 42 C 55 28 62 28 75 42"
                  stroke="#F59E0B"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  fill="none"
                  opacity="0.5"
                />
                <circle cx="75" cy="42" r="2.2" fill="#F59E0B" filter="url(#ariane-fab-glow)" />
              </g>
            </svg>
            {/* Bouton 64px */}
            <button
              type="button"
              onClick={() => setFilArianePanelOpen(true)}
              className="relative h-16 w-16 rounded-full bg-background/95 backdrop-blur-xl border border-amber-500/40 shadow-[0_4px_24px_hsl(38_92%_50%/0.25)] flex items-center justify-center transition-[transform,box-shadow,border-color] duration-200 hover:scale-110 hover:border-amber-500/70 hover:shadow-[0_6px_32px_hsl(38_92%_50%/0.45)] active:scale-95"
              aria-label={`Fil d'Ariane — ${allAlerts.length + allMissingAssets.length} élément${allAlerts.length + allMissingAssets.length > 1 ? "s" : ""}`}
            >
              <ArianeOrbitIcon size={30} />
              <span className="absolute -top-1 -right-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-amber-500 px-1.5 text-xs font-bold text-white tabular-nums ring-2 ring-background">
                {allAlerts.length + allMissingAssets.length > 99 ? "99+" : allAlerts.length + allMissingAssets.length}
              </span>
            </button>
          </div>
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
              onCreateMissingAsset={handleCreateMissingAsset}
              filArianeLimit={TIER_CONFIG[userPlan].filArianeLimit}
            />
          )}
        </SheetContent>
      </Sheet>

      <QuotaReachedDialog
        open={showQuotaModal}
        onOpenChange={setShowQuotaModal}
        plan={userPlan}
        usageInfo={usageInfo}
        nextResetDate={nextResetDate}
      />
    </DashboardLayout>
  );
}
