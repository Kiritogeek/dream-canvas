import { useState, useCallback, useEffect } from "react";
import { Globe, Users, MapPin, Box, Save, Loader2, ChevronDown, ChevronUp, Info, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useUpdateProject } from "@/hooks/useProjects";
import { useUpdateAsset } from "@/hooks/useAssets";
import { useScenarioChapters } from "@/hooks/useScenarioChapters";
import { useNarraMindDebounce } from "@/hooks/useNarraMindDebounce";
import { useCompassIndex } from "@/hooks/useCompassIndex";
import { useCompassProposals } from "@/hooks/useCompassProposals";
import { useUserPlan } from "@/hooks/useUserPlan";
import { CompassSuggestionsPanel } from "./CompassSuggestionsPanel";
import type { Project, Asset } from "@/types";

interface Props {
  project: Project;
  assets: Asset[];
}

type UniverseTab = "monde" | "character" | "background" | "object";

const TABS: { id: UniverseTab; label: string; icon: React.ElementType; assetType?: Asset["asset_type"] }[] = [
  { id: "monde",      label: "Monde",        icon: Globe    },
  { id: "character",  label: "Personnages",   icon: Users,    assetType: "character"  },
  { id: "background", label: "Lieux",         icon: MapPin,   assetType: "background" },
  { id: "object",     label: "Objets",        icon: Box,      assetType: "object"     },
];

type LoreSectionKey = "magic" | "geography" | "factions" | "culture" | "timeline";

interface LoreSectionConfig {
  key: LoreSectionKey;
  emoji: string;
  label: string;
  description: string;
  field: keyof Pick<Project, "lore_magic" | "lore_geography" | "lore_factions" | "lore_culture" | "lore_timeline">;
  sectionTitle: string;
}

const LORE_SECTIONS: LoreSectionConfig[] = [
  {
    key: "magic",
    emoji: "🌀",
    label: "Système de magie",
    description: "Décris les règles, les limites et l'origine des pouvoirs magiques dans ton univers.",
    field: "lore_magic",
    sectionTitle: "Système de magie",
  },
  {
    key: "geography",
    emoji: "🗺️",
    label: "Géographie & Lieux",
    description: "Décris les continents, villes, lieux emblématiques et leur importance narrative.",
    field: "lore_geography",
    sectionTitle: "Géographie & Lieux",
  },
  {
    key: "factions",
    emoji: "⚔️",
    label: "Factions & Pouvoirs",
    description: "Présente les organisations, guildes, royaumes et leurs rapports de force.",
    field: "lore_factions",
    sectionTitle: "Factions & Pouvoirs",
  },
  {
    key: "culture",
    emoji: "📜",
    label: "Culture & Société",
    description: "Décris les mœurs, traditions, religions, langues et structures sociales.",
    field: "lore_culture",
    sectionTitle: "Culture & Société",
  },
  {
    key: "timeline",
    emoji: "🕰️",
    label: "Chronologie",
    description: "Liste les événements fondateurs, ères historiques et dates clés de ton univers.",
    field: "lore_timeline",
    sectionTitle: "Chronologie",
  },
];

function buildUniverseLore(
  magic: string,
  geography: string,
  factions: string,
  culture: string,
  timeline: string
): string {
  const parts = [
    magic && `=== Système de magie ===\n${magic}`,
    geography && `=== Géographie & Lieux ===\n${geography}`,
    factions && `=== Factions & Pouvoirs ===\n${factions}`,
    culture && `=== Culture & Société ===\n${culture}`,
    timeline && `=== Chronologie ===\n${timeline}`,
  ].filter(Boolean);
  return parts.join("\n\n");
}

interface LoreValues {
  magic: string;
  geography: string;
  factions: string;
  culture: string;
  timeline: string;
}

function LoreWorldSection({
  config,
  value,
  allValues,
  project,
  onSaved,
}: {
  config: LoreSectionConfig;
  value: string;
  allValues: LoreValues;
  project: Project;
  onSaved: (key: LoreSectionKey, newValue: string) => void;
}) {
  const { toast } = useToast();
  const updateProject = useUpdateProject();
  const { indexContent } = useCompassIndex();
  const { plan } = useUserPlan();
  const compassProposals = useCompassProposals(project.id);

  const [localValue, setLocalValue] = useState(value);
  const [saving, setSaving] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const isDirty = localValue !== value;
  const canSuggest = plan !== "libre";

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const updatedAll = { ...allValues, [config.key]: localValue };
      const universeLore = buildUniverseLore(
        updatedAll.magic,
        updatedAll.geography,
        updatedAll.factions,
        updatedAll.culture,
        updatedAll.timeline
      );
      await updateProject.mutateAsync({
        id: project.id,
        updates: { [config.field]: localValue, universe_lore: universeLore },
      });
      onSaved(config.key, localValue);
      indexContent(project.id, "lore_world_section", project.id, localValue, config.key);
    } catch {
      toast({ title: "Erreur", description: "Impossible de sauvegarder.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }, [
    localValue,
    allValues,
    config,
    project.id,
    updateProject,
    onSaved,
    indexContent,
    toast,
  ]);

  const handleOpenSuggestions = useCallback(async () => {
    if (panelOpen) {
      setPanelOpen(false);
      compassProposals.reset();
      return;
    }
    setPanelOpen(true);
    await compassProposals.fetchProposals(localValue || project.universe_lore || "", "lore_world", project.id);
  }, [panelOpen, localValue, project.universe_lore, project.id, compassProposals]);

  const handleAddToLore = useCallback(
    (content: string, proposalId: string) => {
      const separator = localValue.trim() ? "\n\n" : "";
      setLocalValue((prev) => prev + separator + content);
      void compassProposals.acceptProposal(proposalId);
      setPanelOpen(false);
    },
    [localValue, compassProposals]
  );

  return (
    <div className="glass rounded-xl p-5 space-y-3">
      <div>
        <h4 className="font-medium text-sm flex items-center gap-2">
          <span>{config.emoji}</span>
          <span>{config.label}</span>
        </h4>
        <p className="text-xs text-muted-foreground mt-0.5">{config.description}</p>
      </div>

      <Textarea
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        placeholder={`${config.label}…`}
        className="min-h-[120px] resize-none text-sm bg-white/5 border-white/10"
        maxLength={1500}
      />

      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">{localValue.length}/1500</span>
        <div className="flex items-center gap-2">
          {canSuggest ? (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-3 text-xs gap-1.5 text-violet-400 hover:text-violet-300 hover:bg-violet-500/10"
              onClick={handleOpenSuggestions}
              disabled={!localValue.trim() || compassProposals.loading}
              title={!localValue.trim() ? "Écris d'abord quelque chose pour obtenir des suggestions" : undefined}
            >
              <Sparkles className="h-3 w-3" />
              Suggestions Ariane
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground italic">
              Suggestions — plan Créateur
            </span>
          )}
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!isDirty || saving}
            className="gradient-primary text-primary-foreground gap-1.5 h-7 px-3 text-xs"
          >
            {saving ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Save className="h-3 w-3" />
            )}
            Sauvegarder
          </Button>
        </div>
      </div>

      <CompassSuggestionsPanel
        proposals={compassProposals.proposals}
        loading={compassProposals.loading}
        error={compassProposals.error}
        onAddToLore={handleAddToLore}
        onDismiss={compassProposals.dismissProposal}
        onRefresh={() =>
          compassProposals.fetchProposals(
            localValue || project.universe_lore || "",
            "lore_world",
            project.id
          )
        }
        isOpen={panelOpen}
      />
    </div>
  );
}

function AssetLoreCard({ asset, onLoreSaved }: { asset: Asset; onLoreSaved?: () => void }) {
  const { toast } = useToast();
  const updateAsset = useUpdateAsset();
  const { indexContent } = useCompassIndex();
  const [lore, setLore] = useState(asset.lore ?? "");
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  const isDirty = lore !== (asset.lore ?? "");

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await updateAsset.mutateAsync({ id: asset.id, projectId: asset.project_id, updates: { lore } });
      toast({ title: "LORE sauvegardé", description: asset.name });
      indexContent(asset.project_id, "asset_lore", asset.id, lore);
      onLoreSaved?.();
    } catch {
      toast({ title: "Erreur", description: "Impossible de sauvegarder.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }, [asset.id, asset.project_id, asset.name, lore, updateAsset, toast, indexContent, onLoreSaved]);

  return (
    <div className="glass rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/5 transition-colors duration-150"
      >
        {asset.image_url ? (
          <img
            src={asset.image_url}
            alt={asset.name}
            className="w-10 h-10 rounded-lg object-cover shrink-0"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0 text-xs text-muted-foreground">
            ?
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{asset.name}</p>
          {asset.lore ? (
            <p className="text-xs text-muted-foreground truncate">{asset.lore}</p>
          ) : (
            <p className="text-xs text-muted-foreground/50 italic">Aucun LORE saisi</p>
          )}
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/10">
          <p className="text-xs text-muted-foreground pt-3">
            Décris ce personnage/lieu/objet : apparence, histoire, rôle dans l&apos;univers. Ce texte
            aide à garder vos chapitres alignés avec le lore du projet.
          </p>
          <Textarea
            value={lore}
            onChange={(e) => setLore(e.target.value)}
            placeholder={`LORE de ${asset.name}…`}
            className="min-h-[100px] resize-none text-sm bg-white/5 border-white/10"
            maxLength={800}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{lore.length}/800</span>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!isDirty || saving}
              className="gradient-primary text-primary-foreground gap-2"
            >
              {saving ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Save className="h-3 w-3" />
              )}
              Sauvegarder
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function UniverseSection({ project, assets }: Props) {
  const { data: scenarioChapters = [] } = useScenarioChapters(project.id);
  const { schedule: scheduleNarraMind } = useNarraMindDebounce();

  const [activeTab, setActiveTab] = useState<UniverseTab>("monde");

  const migrationBannerKey = `lore_migration_banner_${project.id}`;
  const hasMigrationBanner =
    !!project.universe_lore &&
    !project.lore_magic &&
    !project.lore_geography &&
    !project.lore_factions &&
    !project.lore_culture &&
    !project.lore_timeline &&
    typeof window !== "undefined" &&
    !localStorage.getItem(migrationBannerKey);

  const [showMigrationBanner, setShowMigrationBanner] = useState(hasMigrationBanner);

  const dismissMigrationBanner = useCallback(() => {
    localStorage.setItem(migrationBannerKey, "1");
    setShowMigrationBanner(false);
  }, [migrationBannerKey]);

  // État local des 5 sections — pré-remplissage migration si magic est null et universe_lore existe
  const [loreValues, setLoreValues] = useState<LoreValues>({
    magic: project.lore_magic ?? (hasMigrationBanner ? (project.universe_lore ?? "") : ""),
    geography: project.lore_geography ?? "",
    factions: project.lore_factions ?? "",
    culture: project.lore_culture ?? "",
    timeline: project.lore_timeline ?? "",
  });

  const handleSectionSaved = useCallback((key: LoreSectionKey, newValue: string) => {
    setLoreValues((prev) => ({ ...prev, [key]: newValue }));
    const latest = [...scenarioChapters].sort((a, b) => b.chapter_number - a.chapter_number)[0];
    if (latest) scheduleNarraMind(project.id, latest.id);
  }, [scenarioChapters, scheduleNarraMind, project.id]);

  const currentTab = TABS.find((t) => t.id === activeTab)!;
  const filteredAssets = currentTab.assetType
    ? assets.filter((a) => a.asset_type === currentTab.assetType)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex gap-1 p-1 glass rounded-xl">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={[
                "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200",
                isActive
                  ? "gradient-primary text-primary-foreground shadow-dream"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5",
              ].join(" ")}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {activeTab === "monde" && (
        <div className="space-y-4">
          {showMigrationBanner && (
            <div className="glass rounded-xl border border-blue-500/20 bg-blue-500/5 px-4 py-3 flex items-start gap-3">
              <Info className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground flex-1">
                Tu avais un lore du monde existant. Il est affiché ci-dessous dans la section
                &ldquo;Système de magie&rdquo; pour démarrer. Tu peux le répartir dans les autres sections.
              </p>
              <button
                type="button"
                onClick={dismissMigrationBanner}
                className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                title="OK, compris"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {LORE_SECTIONS.map((config) => (
            <LoreWorldSection
              key={config.key}
              config={config}
              value={loreValues[config.key]}
              allValues={loreValues}
              project={project}
              onSaved={handleSectionSaved}
            />
          ))}
        </div>
      )}

      {activeTab !== "monde" && (
        <div className="space-y-3">
          {filteredAssets.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center">
              <currentTab.icon className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-muted-foreground text-sm">
                Aucun {currentTab.label.toLowerCase()} dans ce projet.
              </p>
              <p className="text-muted-foreground/60 text-xs mt-1">
                Crée des assets dans l&apos;onglet Assets pour y associer un LORE.
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground px-1">
                {filteredAssets.length} {currentTab.label.toLowerCase()} — cliquez pour éditer le LORE
              </p>
              {filteredAssets.map((asset) => (
                <AssetLoreCard key={asset.id} asset={asset} onLoreSaved={() => {
                  const latest = [...scenarioChapters].sort((a, b) => b.chapter_number - a.chapter_number)[0];
                  if (latest) scheduleNarraMind(project.id, latest.id);
                }} />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
