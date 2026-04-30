import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Globe, Users, MapPin, Box, Save, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useUpdateProject } from "@/hooks/useProjects";
import { useUpdateAsset } from "@/hooks/useAssets";
import { useScenarioChapters } from "@/hooks/useScenarioChapters";
import { triggerNarraMindUpdate } from "@/services/scenarioAI";
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

function AssetLoreCard({ asset, onLoreSaved }: { asset: Asset; onLoreSaved?: () => void }) {
  const { toast } = useToast();
  const updateAsset = useUpdateAsset();
  const [lore, setLore] = useState(asset.lore ?? "");
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  const isDirty = lore !== (asset.lore ?? "");

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await updateAsset.mutateAsync({ id: asset.id, projectId: asset.project_id, updates: { lore } });
      toast({ title: "LORE sauvegardé", description: asset.name });
      onLoreSaved?.();
    } catch {
      toast({ title: "Erreur", description: "Impossible de sauvegarder.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }, [asset.id, asset.project_id, asset.name, lore, updateAsset, toast, onLoreSaved]);

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
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const updateProject = useUpdateProject();
  const { data: scenarioChapters = [] } = useScenarioChapters(project.id);
  const [activeTab, setActiveTab] = useState<UniverseTab>("monde");
  const [universeLore, setUniverseLore] = useState(project.universe_lore ?? "");
  const [savingLore, setSavingLore] = useState(false);

  const isLoreDirty = universeLore !== (project.universe_lore ?? "");

  const triggerNarraMindOnLatestChapter = useCallback(() => {
    const latest = [...scenarioChapters].sort((a, b) => b.chapter_number - a.chapter_number)[0];
    if (!latest) return;
    void triggerNarraMindUpdate(project.id, latest.id)
      .then(() => {
        void queryClient.invalidateQueries({ queryKey: ["scenario-chapter", latest.id] });
        void queryClient.invalidateQueries({ queryKey: ["scenario-chapters", project.id] });
      })
      .catch(() => {});
  }, [project.id, scenarioChapters, queryClient]);

  const handleSaveLore = useCallback(async () => {
    setSavingLore(true);
    try {
      await updateProject.mutateAsync({ id: project.id, updates: { universe_lore: universeLore } });
      toast({ title: "Lore du monde sauvegardé" });
      triggerNarraMindOnLatestChapter();
    } catch {
      toast({ title: "Erreur", description: "Impossible de sauvegarder.", variant: "destructive" });
    } finally {
      setSavingLore(false);
    }
  }, [project.id, universeLore, updateProject, toast, triggerNarraMindOnLatestChapter]);

  const currentTab = TABS.find((t) => t.id === activeTab)!;
  const filteredAssets = currentTab.assetType
    ? assets.filter((a) => a.asset_type === currentTab.assetType)
    : [];

  return (
    <div className="space-y-6">
      {/* Tab bar */}
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

      {/* Monde */}
      {activeTab === "monde" && (
        <div className="glass rounded-2xl p-6 space-y-4">
          <div>
            <h3 className="font-display font-semibold text-lg">Lore du monde</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Décris les règles, l&apos;histoire et l&apos;atmosphère de ton univers. Ce contexte est
              pris en compte pour repérer d&apos;éventuelles incohérences dans le scénario.
            </p>
          </div>
          <Textarea
            value={universeLore}
            onChange={(e) => setUniverseLore(e.target.value)}
            placeholder="Ex : Dans ce monde, la magie est interdite depuis la Grande Purge de 847. Les humains vivent sous la domination des Gardiens, une caste militaire…"
            className="min-h-[200px] resize-none text-sm bg-white/5 border-white/10"
            maxLength={3000}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{universeLore.length}/3000</span>
            <Button
              onClick={handleSaveLore}
              disabled={!isLoreDirty || savingLore}
              className="gradient-primary text-primary-foreground gap-2"
            >
              {savingLore ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Sauvegarder
            </Button>
          </div>
        </div>
      )}

      {/* Assets tabs */}
      {activeTab !== "monde" && (
        <div className="space-y-3">
          {filteredAssets.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center">
              <currentTab.icon className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-muted-foreground text-sm">
                Aucun {currentTab.label.toLowerCase()} dans ce projet.
              </p>
              <p className="text-muted-foreground/60 text-xs mt-1">
                Crée des assets dans l'onglet Assets pour y associer un LORE.
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground px-1">
                {filteredAssets.length} {currentTab.label.toLowerCase()} — cliquez pour éditer le LORE
              </p>
              {filteredAssets.map((asset) => (
                <AssetLoreCard key={asset.id} asset={asset} onLoreSaved={triggerNarraMindOnLatestChapter} />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
