// Panneau de curation des assets du chapitre — étape 2 de la validation en 3 étapes.
//
// Liste effective = (assets auto-détectés par regex, sauf removed) ∪ (assets added).
// `chapter_assets.items` ne stocke que les décisions utilisateur (overrides) ;
// la détection auto reste calculée à la volée et fusionnée ici.

import { ReactNode, useMemo, useState } from "react";
import {
  Loader2,
  Sparkles,
  Check,
  X,
  EyeOff,
  Plus,
  Link2,
  AlertTriangle,
  Wand2,
  Layers,
  CheckCircle2,
  ImageOff,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAssetGeneration } from "@/hooks/useAssetGeneration";
import { useChapterAssets, useUpdateChapterAssets } from "@/hooks/useScenarioChapters";
import { useCreateAsset } from "@/hooks/useAssets";
import { useActiveLoreAssetProposals } from "@/hooks/useCompassProposals";
import { useGeneratingAssetId } from "@/lib/generationPending";
import {
  contentContainsAssetName,
  extractSceneHeaderEntities,
  normalizeEntityName,
} from "@/services/scenarioChapters";
import type {
  Asset,
  AssetType,
  ChapterAssetItem,
  ChapterAssetsState,
  Project,
  UsageInfo,
  UserPlan,
} from "@/types";
import { EMPTY_CHAPTER_ASSETS } from "@/types";

interface ChapterAssetCurationPanelProps {
  chapterId: string;
  projectId: string;
  content: string;
  assets: Asset[];
  project: Project | null;
  userPlan: UserPlan;
  usageInfo: UsageInfo;
  readOnly?: boolean;
  onQuotaReached?: () => void;
  /** Actions principales de l'étape, ancrées dans le footer sticky du panneau. */
  footer?: ReactNode;
}

type AssetState = "generated" | "missing" | "skipped";

interface EffectiveAsset {
  asset: Asset;
  origin: "auto" | "added";
  status: ChapterAssetItem["status"];
  state: AssetState;
}

function detectAuto(content: string, assets: Asset[]): Asset[] {
  if (!content.trim() || !assets.length) return [];
  return assets.filter((a) => {
    const name = a.name?.trim();
    if (!name || name.length < 2) return false;
    return contentContainsAssetName(content, name);
  });
}

const TINY_BTN =
  "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-[transform,background-color,color,border-color] duration-150 hover:scale-[1.04] active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none";

export function ChapterAssetCurationPanel({
  chapterId,
  projectId,
  content,
  assets,
  project,
  userPlan,
  usageInfo,
  readOnly = false,
  onQuotaReached,
  footer,
}: ChapterAssetCurationPanelProps) {
  const { data: curation = EMPTY_CHAPTER_ASSETS } = useChapterAssets(chapterId);
  const updateAssets = useUpdateChapterAssets();
  const createAsset = useCreateAsset();
  const generatingAssetId = useGeneratingAssetId();
  const { data: loreProposals = [] } = useActiveLoreAssetProposals(projectId);

  const { canGenerate, generate } = useAssetGeneration({
    project,
    userPlan,
    usageInfo,
    onQuotaReached,
  });

  const [addPickerValue, setAddPickerValue] = useState<string>("");
  const [creatingKey, setCreatingKey] = useState<string | null>(null);
  const [linkTargetAlias, setLinkTargetAlias] = useState<string | null>(null);

  const overrideById = useMemo(() => {
    const map = new Map<string, ChapterAssetItem>();
    for (const it of curation.items) map.set(it.asset_id, it);
    return map;
  }, [curation.items]);

  const autoDetected = useMemo(() => detectAuto(content, assets), [content, assets]);

  // Liste effective : auto (sauf removed) ∪ added.
  const effective = useMemo<EffectiveAsset[]>(() => {
    const out: EffectiveAsset[] = [];
    const seen = new Set<string>();

    for (const asset of autoDetected) {
      const override = overrideById.get(asset.id);
      if (override?.status === "removed") continue;
      const status = override?.status === "skipped" ? "skipped" : "auto";
      const state: AssetState = status === "skipped" ? "skipped" : asset.image_url ? "generated" : "missing";
      out.push({ asset, origin: "auto", status, state });
      seen.add(asset.id);
    }

    for (const it of curation.items) {
      if (it.status !== "added" || seen.has(it.asset_id)) continue;
      const asset = assets.find((a) => a.id === it.asset_id);
      if (!asset) continue;
      const state: AssetState = asset.image_url ? "generated" : "missing";
      out.push({ asset, origin: "added", status: "added", state });
      seen.add(asset.id);
    }

    return out;
  }, [autoDetected, curation.items, overrideById, assets]);

  const missingCount = effective.filter((e) => e.state === "missing").length;
  const generatedCount = effective.filter((e) => e.state === "generated").length;

  // Assets ajoutables : tout asset du projet pas déjà dans la liste effective.
  const addableAssets = useMemo(() => {
    const present = new Set(effective.map((e) => e.asset.id));
    return assets.filter((a) => !present.has(a.id));
  }, [assets, effective]);

  // Section « À créer » : éléments mentionnés sans asset correspondant.
  // Fusion (dédup nom, insensible casse/accents) de :
  //   - en-têtes de scène > Personnages / > Lieu sans asset existant,
  //   - propositions Ariane lore_asset actives (type character par défaut).
  const toCreate = useMemo<{ name: string; type: AssetType }[]>(() => {
    const existingNames = new Set(assets.map((a) => normalizeEntityName(a.name ?? "")));
    const out: { name: string; type: AssetType }[] = [];
    const seen = new Set<string>();

    const add = (name: string, type: AssetType) => {
      const cleaned = name.trim();
      if (cleaned.length < 2) return;
      const norm = normalizeEntityName(cleaned);
      if (!norm || existingNames.has(norm) || seen.has(norm)) return;
      seen.add(norm);
      out.push({ name: cleaned, type });
    };

    for (const e of extractSceneHeaderEntities(content)) add(e.name, e.type);
    for (const p of loreProposals) add(p.title, "character");

    return out;
  }, [assets, content, loreProposals]);

  const setItemStatus = (assetId: string, status: ChapterAssetItem["status"] | null) => {
    if (readOnly) return;
    const items = curation.items.filter((it) => it.asset_id !== assetId);
    if (status !== null) {
      const existing = curation.items.find((it) => it.asset_id === assetId);
      const next: ChapterAssetItem = { asset_id: assetId, status };
      if (existing?.linked_alias) next.linked_alias = existing.linked_alias;
      items.push(next);
    }
    const nextState: ChapterAssetsState = { ...curation, items };
    updateAssets.mutate({ chapterId, projectId, state: nextState });
  };

  const handleGenerate = (asset: Asset) => {
    if (readOnly) return;
    if (!canGenerate()) return;
    generate(asset);
  };

  const handleAdd = (assetId: string) => {
    setItemStatus(assetId, "added");
    setAddPickerValue("");
  };

  const markAdded = (assetId: string) => {
    const items = curation.items.filter((it) => it.asset_id !== assetId);
    items.push({ asset_id: assetId, status: "added" });
    const nextState: ChapterAssetsState = { ...curation, items };
    updateAssets.mutate({ chapterId, projectId, state: nextState });
  };

  // Lier une mention « à créer » non résolue à un asset existant.
  const handleLink = (entry: { name: string; type: AssetType }, assetId: string) => {
    if (readOnly) return;
    const items = curation.items.filter((it) => it.asset_id !== assetId);
    items.push({ asset_id: assetId, status: "added", linked_alias: entry.name });
    const nextState: ChapterAssetsState = { ...curation, items };
    updateAssets.mutate({ chapterId, projectId, state: nextState });
    setLinkTargetAlias(null);
  };

  // « Créer l'asset » : crée + génère immédiatement, puis bascule en « added ».
  const handleCreate = (entry: { name: string; type: AssetType }) => {
    if (readOnly || creatingKey) return;
    if (!canGenerate()) return; // quota / style — toast géré dans le hook
    const key = normalizeEntityName(entry.name);
    setCreatingKey(key);
    createAsset.mutate(
      {
        project_id: projectId,
        name: entry.name,
        asset_type: entry.type,
        prompt: entry.name,
      },
      {
        onSuccess: (asset) => {
          markAdded(asset.id);
          void generate(asset).finally(() => setCreatingKey(null));
        },
        onError: () => setCreatingKey(null),
      }
    );
  };

  return (
    <aside className="glass w-80 shrink-0 border-l border-[hsl(var(--lavender)/0.18)] flex flex-col min-h-0 rounded-none">
      {/* En-tête */}
      <div className="px-4 pt-4 pb-3 border-b border-border/40">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[hsl(var(--lavender)/0.14)] text-[hsl(var(--lavender))]">
            <Layers className="h-4 w-4" />
          </span>
          <p className="text-sm font-display font-semibold text-foreground">Curation des assets</p>
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/12 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            {generatedCount} prêt{generatedCount > 1 ? "s" : ""}
          </span>
          {missingCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/12 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-3 w-3" />
              {missingCount} sans visuel
            </span>
          )}
        </div>
      </div>

      {/* Corps défilant */}
      <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-4">
        {/* Section 1 — Assets du chapitre */}
        <section className="flex flex-col gap-2">
          <header className="flex items-center justify-between px-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Assets du chapitre
            </p>
            <span className="text-[11px] font-medium text-muted-foreground/70">
              {effective.length}
            </span>
          </header>

          {effective.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border/60 bg-background/30 px-4 py-7 text-center">
              <ImageOff className="h-5 w-5 text-muted-foreground/60" />
              <p className="text-xs text-muted-foreground">Aucun asset détecté</p>
              <p className="text-[11px] text-muted-foreground/70 max-w-[14rem]">
                Ajoutez un asset depuis la bibliothèque, ou créez ceux mentionnés ci-dessous.
              </p>
            </div>
          ) : (
            effective.map(({ asset, status, state }) => {
              const isGenerating = generatingAssetId === asset.id;
              return (
                <article
                  key={asset.id}
                  className="group flex gap-3 rounded-xl border border-border/50 bg-background/40 p-2.5 transition-[transform,border-color] duration-150 hover:border-[hsl(var(--lavender)/0.35)]"
                >
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-[hsl(var(--lavender)/0.08)] flex items-center justify-center">
                    {asset.image_url ? (
                      <img
                        src={asset.image_url}
                        alt={asset.name}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <ImageOff className="h-4 w-4 text-muted-foreground/50" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-semibold text-foreground truncate">{asset.name}</p>
                      {status === "added" && (
                        <span className="shrink-0 rounded-full bg-[hsl(var(--lavender)/0.12)] px-1.5 py-px text-[10px] font-medium text-[hsl(var(--lavender))]">
                          ajouté
                        </span>
                      )}
                    </div>

                    <div className="mt-1">
                      {state === "generated" && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                          <Check className="h-3 w-3" /> Généré
                        </span>
                      )}
                      {state === "missing" && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                          <AlertTriangle className="h-3 w-3" /> Manquant
                        </span>
                      )}
                      {state === "skipped" && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                          <EyeOff className="h-3 w-3" /> Ignoré
                        </span>
                      )}
                    </div>

                    {!readOnly && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {state === "missing" && (
                          <button
                            onClick={() => handleGenerate(asset)}
                            disabled={isGenerating}
                            className={`${TINY_BTN} gradient-primary text-primary-foreground shadow-sm`}
                          >
                            {isGenerating ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Sparkles className="h-3 w-3" />
                            )}
                            Générer
                          </button>
                        )}

                        {state === "missing" && status !== "skipped" && (
                          <button
                            onClick={() => setItemStatus(asset.id, "skipped")}
                            className={`${TINY_BTN} border border-border/60 text-muted-foreground hover:text-foreground hover:border-border`}
                          >
                            <EyeOff className="h-3 w-3" />
                            Ne pas générer
                          </button>
                        )}

                        {status === "skipped" && (
                          <button
                            onClick={() => setItemStatus(asset.id, null)}
                            className={`${TINY_BTN} border border-border/60 text-muted-foreground hover:text-foreground hover:border-border`}
                          >
                            <Check className="h-3 w-3" />
                            Réactiver
                          </button>
                        )}

                        <button
                          onClick={() =>
                            setItemStatus(asset.id, status === "added" ? null : "removed")
                          }
                          title={status === "added" ? "Retirer de la liste" : "Faux positif, retirer"}
                          className={`${TINY_BTN} text-muted-foreground hover:text-destructive`}
                        >
                          <X className="h-3 w-3" />
                          Retirer
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </section>

        {/* Ajouter un asset depuis la bibliothèque */}
        {!readOnly && addableAssets.length > 0 && (
          <div className="px-1">
            <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
              <Plus className="h-3 w-3" />
              Ajouter depuis la bibliothèque
            </div>
            <Select value={addPickerValue} onValueChange={handleAdd}>
              <SelectTrigger className="h-9 text-xs glass border-border/50 hover:border-[hsl(var(--lavender)/0.35)] transition-colors">
                <SelectValue placeholder="Choisir un asset existant" />
              </SelectTrigger>
              <SelectContent>
                {addableAssets.map((a) => (
                  <SelectItem key={a.id} value={a.id} className="text-xs">
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Section 2 — À créer */}
        {toCreate.length > 0 && (
          <section className="flex flex-col gap-2">
            <header className="flex items-center justify-between px-1 pt-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                À créer
              </p>
              <span className="text-[11px] font-medium text-muted-foreground/70">
                {toCreate.length}
              </span>
            </header>

            {toCreate.map((entry) => {
              const key = normalizeEntityName(entry.name);
              const isCreating = creatingKey === key;
              const isLinking = linkTargetAlias === key;
              return (
                <article
                  key={key}
                  className="rounded-xl border border-dashed border-[hsl(var(--lavender)/0.3)] bg-[hsl(var(--lavender)/0.04)] p-2.5"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--lavender)/0.1)] text-[hsl(var(--lavender))]">
                      <Wand2 className="h-4 w-4" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{entry.name}</p>
                      <span className="mt-0.5 inline-flex items-center rounded-full bg-background/50 px-1.5 py-px text-[10px] font-medium text-muted-foreground">
                        {entry.type === "character" ? "Personnage" : "Décor"}
                      </span>
                    </div>
                  </div>

                  {!readOnly && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <button
                        onClick={() => handleCreate(entry)}
                        disabled={isCreating || creatingKey !== null}
                        className={`${TINY_BTN} gradient-primary text-primary-foreground shadow-sm`}
                      >
                        {isCreating ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Wand2 className="h-3 w-3" />
                        )}
                        Créer l'asset
                      </button>

                      {addableAssets.length > 0 && (
                        <button
                          onClick={() => setLinkTargetAlias(isLinking ? null : key)}
                          className={`${TINY_BTN} border border-border/60 text-muted-foreground hover:text-foreground hover:border-border`}
                        >
                          <Link2 className="h-3 w-3" />
                          Lier
                        </button>
                      )}
                    </div>
                  )}

                  {isLinking && !readOnly && (
                    <div className="mt-2">
                      <Select
                        value=""
                        onValueChange={(assetId) => handleLink(entry, assetId)}
                      >
                        <SelectTrigger className="h-8 text-xs glass border-[hsl(var(--lavender)/0.3)]">
                          <SelectValue placeholder="Lier à un asset existant" />
                        </SelectTrigger>
                        <SelectContent>
                          {addableAssets.map((a) => (
                            <SelectItem key={a.id} value={a.id} className="text-xs">
                              {a.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </article>
              );
            })}
          </section>
        )}

        {effective.length === 0 && toCreate.length === 0 && (
          <div className="flex flex-col items-center gap-1.5 px-4 py-6 text-center">
            <Check className="h-5 w-5 text-emerald-500/70" />
            <p className="text-xs text-muted-foreground">Rien à créer</p>
          </div>
        )}
      </div>

      {/* Footer sticky — actions principales de l'étape (anti-collision FAB) */}
      {footer && (
        <div className="border-t border-border/40 bg-background/40 px-3 py-3 flex flex-col gap-2">
          {footer}
        </div>
      )}
    </aside>
  );
}
