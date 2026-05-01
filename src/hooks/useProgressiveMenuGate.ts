import { useMemo, useEffect, useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useProject, useProjectCount, useProjects } from "@/hooks/useProjects";
import { useScenarioChapters } from "@/hooks/useScenarioChapters";
import { useAssets } from "@/hooks/useAssets";
import {
  extractStyleKeyFromTemplateText,
  hasStyleSystemBlock,
} from "@/lib/styleTemplateMeta";
import {
  ARIANE_FORCED_PROGRESSIVE_PENDING,
  ARIANE_FORCED_PROGRESSIVE_PROJECT_SESSION_KEY,
  ARIANE_PROGRESSIVE_SIDEBAR_BUMP_EVENT,
} from "@/constants/ariane";
import {
  dismissMenuNew,
  isMenuNewDismissed,
  isArianeTabTourComplete,
  type ProgressiveMenuStep,
} from "@/lib/progressiveOnboardingStorage";

export type ProgressiveTabKey = "style" | ProgressiveMenuStep;

export type ProgressiveAccess = Record<ProgressiveTabKey, boolean>;

const ORDER: ProgressiveTabKey[] = ["style", "scenario", "assets", "universe", "edition"];

export function getMaxAccessibleTab(accessible: ProgressiveAccess): ProgressiveTabKey {
  let last: ProgressiveTabKey = "style";
  for (const key of ORDER) {
    if (key === "style") continue;
    if (accessible[key]) last = key;
    else break;
  }
  return last;
}

export function useProgressiveMenuAccess(projectId: string | undefined) {
  const { user } = useAuth();
  const userId = user?.id;
  const { data: projectCount, isLoading: loadingCount } = useProjectCount();
  const { data: projects = [], isLoading: loadingProjects } = useProjects();
  const { data: project, isLoading: loadingProject } = useProject(projectId);
  const { data: scenarioChapters = [], isLoading: loadingScenarios } = useScenarioChapters(projectId);
  const { data: assets = [], isLoading: loadingAssets } = useAssets(projectId);

  const isResolved = Boolean(
    projectId &&
      userId &&
      !loadingCount &&
      !loadingProject &&
      !loadingScenarios &&
      !loadingAssets &&
      project != null &&
      projectCount != null
  );

  const appliesProgressiveFlow = useMemo(() => {
    if (typeof window !== "undefined" && projectId) {
      const forced = sessionStorage.getItem(ARIANE_FORCED_PROGRESSIVE_PROJECT_SESSION_KEY);
      if (forced && forced !== ARIANE_FORCED_PROGRESSIVE_PENDING && forced === projectId) {
        return true;
      }
    }
    if (projectCount != null) return projectCount === 1;
    if (!loadingProjects && projects.length === 1) return true;
    return false;
  }, [projectId, projectCount, loadingProjects, projects.length]);

  const styleValidated = useMemo(() => {
    if (!project) return false;
    const key = extractStyleKeyFromTemplateText(project.style_template);
    return hasStyleSystemBlock(project.style_template) && !!key;
  }, [project]);

  const hasScenarioChapter = scenarioChapters.length >= 1;
  const hasGeneratedAsset = assets.some((a) => !!a.image_url);
  const hasUniverseLoreSaved = useMemo(() => {
    const world = (project?.universe_lore ?? "").trim().length > 0;
    const assetLore = assets.some((a) => (a.lore ?? "").trim().length > 0);
    return world || assetLore;
  }, [project?.universe_lore, assets]);

  const accessible = useMemo<ProgressiveAccess>(() => {
    if (!appliesProgressiveFlow) {
      return {
        style: true,
        scenario: true,
        assets: true,
        universe: true,
        edition: true,
      };
    }
    return {
      style: true,
      scenario: styleValidated,
      assets: styleValidated && hasScenarioChapter,
      universe: styleValidated && hasScenarioChapter && hasGeneratedAsset,
      edition:
        styleValidated &&
        hasScenarioChapter &&
        hasGeneratedAsset &&
        hasUniverseLoreSaved,
    };
  }, [
    appliesProgressiveFlow,
    styleValidated,
    hasScenarioChapter,
    hasGeneratedAsset,
    hasUniverseLoreSaved,
  ]);

  return {
    isResolved,
    appliesProgressiveFlow,
    accessible,
    userId,
  };
}

export function useProgressiveMenuSidebarState(
  projectId: string | undefined,
  sidebarActiveStep: string
) {
  const { isResolved, appliesProgressiveFlow, accessible, userId } =
    useProgressiveMenuAccess(projectId);
  const [, setTick] = useState(0);
  const accessibleRef = useRef(accessible);
  accessibleRef.current = accessible;

  useEffect(() => {
    const onBump = () => setTick((n) => n + 1);
    window.addEventListener(ARIANE_PROGRESSIVE_SIDEBAR_BUMP_EVENT, onBump);
    return () => window.removeEventListener(ARIANE_PROGRESSIVE_SIDEBAR_BUMP_EVENT, onBump);
  }, []);

  useEffect(() => {
    if (!userId || !projectId || !appliesProgressiveFlow || !isResolved) return;
    if (sidebarActiveStep === "style") return;
    const steps: ProgressiveMenuStep[] = ["scenario", "assets", "universe", "edition"];
    if (!steps.includes(sidebarActiveStep as ProgressiveMenuStep)) return;
    const step = sidebarActiveStep as ProgressiveMenuStep;
    if (!accessibleRef.current[step]) return;
    if (!isArianeTabTourComplete(userId, projectId, step)) return;
    dismissMenuNew(userId, step);
    setTick((n) => n + 1);
  }, [userId, projectId, appliesProgressiveFlow, isResolved, sidebarActiveStep]);

  const showNew =
    !userId || !appliesProgressiveFlow
      ? {
          style: false,
          scenario: false,
          assets: false,
          universe: false,
          edition: false,
        }
      : (() => {
          const base = {
            style: false,
            scenario: false,
            assets: false,
            universe: false,
            edition: false,
          };
          const steps: ProgressiveMenuStep[] = ["scenario", "assets", "universe", "edition"];
          const out = { ...base };
          for (const s of steps) {
            out[s] = accessible[s] && !isMenuNewDismissed(userId, s);
          }
          return out;
        })();

  return {
    isResolved,
    appliesProgressiveFlow,
    accessible,
    showNew,
  };
}
