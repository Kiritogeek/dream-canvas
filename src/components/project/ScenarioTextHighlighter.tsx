// ═══════════════════════════════════════════════════════════════
// ScenarioTextHighlighter — Surligne les assets existants (hover = image)
// + surligne en ambre les éléments non créés détectés
// + panneau « éléments non créés » avec hover → créer comme asset
// ═══════════════════════════════════════════════════════════════

import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { Plus, UserRound, Image, Package } from "lucide-react";
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from "@/components/ui/hover-card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Asset, AssetType } from "@/types";

// ── Types ─────────────────────────────────────────────────────

interface ScenarioTextHighlighterProps {
  text: string;
  assets: Asset[];
  className?: string;
  /** Appelé quand l'utilisateur clique « Créer comme asset » */
  onCreateAsset?: (name: string, type: AssetType) => void;
}

// ── Couleurs par type d'asset (charte DreamWeave) ─────────────

const ASSET_COLORS: Record<
  string,
  { bg: string; border: string; label: string; tagBg: string; tagText: string }
> = {
  character: {
    bg: "hsl(var(--lavender) / 0.35)",
    border: "hsl(var(--lavender) / 0.6)",
    label: "Personnage",
    tagBg: "hsl(var(--lavender) / 0.2)",
    tagText: "hsl(var(--lavender) / 1)",
  },
  background: {
    bg: "hsl(var(--mint) / 0.35)",
    border: "hsl(var(--mint) / 0.6)",
    label: "Décor",
    tagBg: "hsl(var(--mint) / 0.2)",
    tagText: "hsl(170 40% 35%)",
  },
  object: {
    bg: "hsl(var(--peach) / 0.4)",
    border: "hsl(var(--peach-deep) / 0.6)",
    label: "Objet",
    tagBg: "hsl(var(--peach) / 0.25)",
    tagText: "hsl(20 60% 40%)",
  },
};

const DEFAULT_COLOR = {
  bg: "hsl(var(--muted) / 0.4)",
  border: "hsl(var(--border))",
  label: "Asset",
  tagBg: "hsl(var(--muted) / 0.3)",
  tagText: "hsl(var(--foreground))",
};

// Couleur ambre pour les éléments non créés
const MISSING_COLOR = {
  bg: "hsl(38 92% 50% / 0.18)",
  border: "hsl(38 92% 50% / 0.5)",
};

// ── Caractères de frontière personnalisés ─────────────────────

const LETTER_CHARS =
  "a-zA-ZàáâãäéèêëïîôùûüÿçÀÁÂÃÄÉÈÊËÏÎÔÙÛÜŸÇœŒæÆ";
const NOT_BEFORE = `(?<![${LETTER_CHARS}\\-])`;
const NOT_AFTER = `(?![${LETTER_CHARS}\\-])`;

// ── Type d'un fragment de texte parsé ─────────────────────────

type TextFragment =
  | { type: "plain"; text: string }
  | { type: "asset"; text: string; asset: Asset }
  | { type: "missing"; text: string; name: string };

// ── Détection des personnages non créés (EXPORTÉE) ────────────

const STRUCTURAL = new Set([
  "lieu", "scène", "scene", "dialogue", "action", "chapitre",
  "acte", "prologue", "épilogue", "epilogue", "fin", "début",
  "note", "résumé", "resume", "titre", "sous-titre",
]);

const STOP_WORDS = new Set([
  "le", "la", "les", "un", "une", "des", "du", "de", "en", "et", "ou",
  "mais", "donc", "or", "ni", "car", "que", "qui", "quoi", "dont", "où",
  "il", "elle", "ils", "elles", "nous", "vous", "je", "tu", "on", "ce",
  "ces", "cette", "cet", "mon", "ma", "mes", "ton", "ta", "tes", "son",
  "sa", "ses", "notre", "nos", "votre", "vos", "leur", "leurs",
  "au", "aux", "par", "pour", "avec", "sans", "dans", "sur", "sous",
  "entre", "vers", "chez", "comme", "si", "ne", "pas", "plus", "se",
  "est", "sont", "sera", "été", "être", "avoir", "fait", "font", "vont",
  "tout", "tous", "toute", "toutes", "très", "bien", "aussi", "alors",
  "puis", "quand", "soudain", "pendant", "après", "avant", "depuis",
  "encore", "jamais", "toujours", "rien", "personne", "chaque", "autre",
  "même", "peu", "trop", "assez", "beaucoup", "comment", "pourquoi",
  "merci", "bonjour", "bonsoir", "oui", "non", "peut", "doit", "veut",
  "faut", "vient", "prend", "dit", "voix", "yeux", "main", "tête",
  "jour", "nuit", "temps", "fois", "coup", "vie", "mort", "homme",
  "femme", "enfant", "monde", "porte", "maison", "rue", "terre",
  "eau", "air", "feu", "ciel", "iii", "ii", "iv",
]);

export function detectMissingNames(text: string, assets: Asset[]): string[] {
  const assetNames = new Set(assets.map((a) => a.name.trim().toLowerCase()));
  const candidates = new Set<string>();

  const dialogueRegex =
    /^\s*([A-ZÀÁÂÃÄÉÈÊËÏÎÔÙÛÜŸÇ][A-ZÀÁÂÃÄÉÈÊËÏÎÔÙÛÜŸÇa-zàáâãäéèêëïîôùûüÿç-]*(?:-[A-ZÀÁÂÃÄÉÈÊËÏÎÔÙÛÜŸÇa-zàáâãäéèêëïîôùûüÿç]+)*)\s*(?:\(|:)/gm;

  for (const m of text.matchAll(dialogueRegex)) {
    addCandidate(m[1], assetNames, candidates);
  }

  const allCapsRegex =
    /\b([A-ZÀÁÂÃÄÉÈÊËÏÎÔÙÛÜŸÇ]{2,}(?:-[A-ZÀÁÂÃÄÉÈÊËÏÎÔÙÛÜŸÇ]{2,})*)\b/g;

  for (const m of text.matchAll(allCapsRegex)) {
    if (m[1].length >= 3) addCandidate(m[1], assetNames, candidates);
  }

  return [...candidates].sort();
}

function addCandidate(
  raw: string,
  assetNames: Set<string>,
  candidates: Set<string>
) {
  const trimmed = raw.trim();
  if (trimmed.length < 2) return;

  const name = trimmed
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join("-");

  const lower = name.toLowerCase();
  if (assetNames.has(lower) || STRUCTURAL.has(lower) || STOP_WORDS.has(lower)) {
    return;
  }
  const parts = lower.split("-");
  if (parts.every((p) => STOP_WORDS.has(p) || STRUCTURAL.has(p))) return;

  candidates.add(name);
}

// ── Construction des fragments ────────────────────────────────

interface BuildResult {
  fragments: TextFragment[];
  detectedAssetCount: number;
  missingNames: string[];
}

function buildAllFragments(text: string, assets: Asset[]): BuildResult {
  if (!text) {
    return { fragments: [{ type: "plain", text: "" }], detectedAssetCount: 0, missingNames: [] };
  }

  const missingNames = detectMissingNames(text, assets);

  const assetsSorted = [...assets]
    .filter((a) => a.name && a.name.trim().length > 1)
    .sort((a, b) => b.name.length - a.name.length);

  const assetLookup = new Map<string, Asset>();
  for (const a of assetsSorted) {
    assetLookup.set(a.name.trim().toLowerCase(), a);
  }

  const missingLookup = new Map<string, string>();
  for (const name of missingNames) {
    missingLookup.set(name.toLowerCase(), name);
  }

  const allTerms = [
    ...assetsSorted.map((a) => a.name.trim()),
    ...missingNames,
  ];
  const uniqueTerms = [...new Set(allTerms)].sort(
    (a, b) => b.length - a.length
  );

  if (uniqueTerms.length === 0) {
    return { fragments: [{ type: "plain", text }], detectedAssetCount: 0, missingNames };
  }

  const escapedTerms = uniqueTerms.map((t) =>
    t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  );
  const pattern = `${NOT_BEFORE}(${escapedTerms.join("|")})${NOT_AFTER}`;
  const regex = new RegExp(pattern, "gi");

  const parts = text.split(regex);
  const detectedAssetIds = new Set<string>();
  const fragments: TextFragment[] = [];

  for (const part of parts) {
    if (!part) continue;
    const lower = part.toLowerCase();
    const asset = assetLookup.get(lower);

    if (asset) {
      detectedAssetIds.add(asset.id);
      fragments.push({ type: "asset", text: part, asset });
    } else if (missingLookup.has(lower)) {
      fragments.push({ type: "missing", text: part, name: missingLookup.get(lower)! });
    } else {
      fragments.push({ type: "plain", text: part });
    }
  }

  return { fragments, detectedAssetCount: detectedAssetIds.size, missingNames };
}

// ── Bouton « Créer comme asset » dans un HoverCard ───────────

function CreateAssetHover({
  name,
  onCreateAsset,
  children,
}: {
  name: string;
  onCreateAsset?: (name: string, type: AssetType) => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  if (!onCreateAsset) return <>{children}</>;

  return (
    <HoverCard open={open} onOpenChange={setOpen} openDelay={150} closeDelay={200}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent
        className="w-56 p-3 glass shadow-dream"
        side="top"
        sideOffset={8}
      >
        <div className="space-y-2">
          <p className="text-sm font-semibold">{name}</p>
          <p className="text-xs text-muted-foreground">
            Créer comme asset :
          </p>
          <div className="flex flex-col gap-1">
            <Button
              variant="outline"
              size="sm"
              className="justify-start gap-2 h-7 text-xs"
              onClick={() => {
                onCreateAsset(name, "character");
                setOpen(false);
              }}
            >
              <UserRound className="h-3 w-3" />
              Personnage
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="justify-start gap-2 h-7 text-xs"
              onClick={() => {
                onCreateAsset(name, "background");
                setOpen(false);
              }}
            >
              <Image className="h-3 w-3" />
              Décor
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="justify-start gap-2 h-7 text-xs"
              onClick={() => {
                onCreateAsset(name, "object");
                setOpen(false);
              }}
            >
              <Package className="h-3 w-3" />
              Objet
            </Button>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

// ── Panneau « Éléments non créés » (affiché hors du chapitre) ─

interface MissingAssetsPanelProps {
  text: string;
  assets: Asset[];
  onCreateAsset?: (name: string, type: AssetType) => void;
}

export function MissingAssetsPanel({
  text,
  assets,
  onCreateAsset,
}: MissingAssetsPanelProps) {
  const missing = useMemo(
    () => detectMissingNames(text, assets),
    [text, assets]
  );

  if (missing.length === 0) return null;

  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-1.5">
      <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
        Personnages / éléments mentionnés non créés comme assets :
      </p>
      <div className="flex flex-wrap gap-1.5">
        {missing.map((name) => (
          <CreateAssetHover key={name} name={name} onCreateAsset={onCreateAsset}>
            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/20 font-medium cursor-pointer hover:bg-amber-500/25 transition-colors">
              {name}
              {onCreateAsset && <Plus className="h-2.5 w-2.5 opacity-60" />}
            </span>
          </CreateAssetHover>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Survolez un nom pour le créer comme asset.
      </p>
    </div>
  );
}

// ── Menu flottant de sélection de texte ─────────────────────

interface SelectionMenuState {
  text: string;
  x: number;
  y: number;
}

function TextSelectionMenu({
  selection,
  onCreateAsset,
  onClose,
}: {
  selection: SelectionMenuState;
  onCreateAsset: (name: string, type: AssetType) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const name = selection.text.trim();
  if (!name) return null;

  return (
    <div
      ref={ref}
      className="fixed z-50 animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-150"
      style={{
        left: `${selection.x}px`,
        top: `${selection.y}px`,
        transform: "translate(-50%, -100%)",
      }}
    >
      <div className="glass shadow-dream rounded-lg border border-border/50 p-3 space-y-2 min-w-[200px]">
        <p className="text-sm font-semibold truncate max-w-[220px]">
          « {name} »
        </p>
        <p className="text-xs text-muted-foreground">Créer comme asset :</p>
        <div className="flex flex-col gap-1">
          <button
            className="flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-md hover:bg-muted/60 transition-colors text-left"
            onClick={() => {
              onCreateAsset(name, "character");
              onClose();
            }}
          >
            <UserRound className="h-3.5 w-3.5 text-[hsl(var(--lavender))]" />
            Personnage
          </button>
          <button
            className="flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-md hover:bg-muted/60 transition-colors text-left"
            onClick={() => {
              onCreateAsset(name, "background");
              onClose();
            }}
          >
            <Image className="h-3.5 w-3.5 text-[hsl(var(--mint))]" />
            Décor
          </button>
          <button
            className="flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-md hover:bg-muted/60 transition-colors text-left"
            onClick={() => {
              onCreateAsset(name, "object");
              onClose();
            }}
          >
            <Package className="h-3.5 w-3.5 text-[hsl(var(--peach))]" />
            Objet
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Composant principal (texte surligné uniquement) ───────────

export function ScenarioTextHighlighter({
  text,
  assets,
  className,
  onCreateAsset,
}: ScenarioTextHighlighterProps) {
  const { fragments, detectedAssetCount, missingNames } = useMemo(
    () => buildAllFragments(text, assets),
    [text, assets]
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const [selectionMenu, setSelectionMenu] = useState<SelectionMenuState | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  const handleMouseUp = useCallback(() => {
    if (!onCreateAsset) return;

    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.toString().trim()) {
      return;
    }

    const selectedText = sel.toString().trim();
    // Ne montrer le menu que si la sélection contient des lettres et est raisonnable
    if (selectedText.length < 2 || selectedText.length > 80) return;
    // Ignorer si c'est une phrase entière (trop long pour un nom d'asset)
    if (selectedText.includes("\n") && selectedText.split("\n").length > 2) return;
    // Nettoyer : prendre seulement un "groupe" de mots
    const cleaned = selectedText.replace(/\n/g, " ").replace(/\s+/g, " ").trim();
    if (!cleaned) return;

    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    setSelectionMenu({
      text: cleaned,
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
    });
  }, [onCreateAsset]);

  const closeSelectionMenu = useCallback(() => {
    setSelectionMenu(null);
    window.getSelection()?.removeAllRanges();
  }, []);

  return (
    <div className="space-y-2">
      {/* Indicateur */}
      <p className="text-xs text-muted-foreground">
        {detectedAssetCount > 0
          ? `${detectedAssetCount} asset${detectedAssetCount > 1 ? "s" : ""} détecté${detectedAssetCount > 1 ? "s" : ""} dans ce chapitre`
          : "Aucun asset détecté dans ce chapitre"}
        {missingNames.length > 0 &&
          ` · ${missingNames.length} élément${missingNames.length > 1 ? "s" : ""} non créé${missingNames.length > 1 ? "s" : ""}`}
        {onCreateAsset && (
          <span className="ml-1 opacity-70">
            · sélectionnez du texte pour créer un asset
          </span>
        )}
      </p>

      {/* Texte surligné */}
      <div
        ref={containerRef}
        className={`whitespace-pre-wrap text-base leading-relaxed ${className ?? ""}`}
        onMouseUp={handleMouseUp}
      >
        {fragments.map((frag, i) => {
          if (frag.type === "plain") {
            return <span key={i}>{frag.text}</span>;
          }

          if (frag.type === "missing") {
            return (
              <CreateAssetHover
                key={i}
                name={frag.name}
                onCreateAsset={onCreateAsset}
              >
                <span
                  className="cursor-pointer rounded-[4px] font-medium hover:brightness-110 transition-all"
                  style={{
                    backgroundColor: MISSING_COLOR.bg,
                    borderBottom: `2.5px solid ${MISSING_COLOR.border}`,
                    padding: "1px 4px",
                  }}
                >
                  {frag.text}
                </span>
              </CreateAssetHover>
            );
          }

          // type === "asset"
          const colors = ASSET_COLORS[frag.asset.asset_type] ?? DEFAULT_COLOR;

          return (
            <HoverCard key={i} openDelay={150} closeDelay={150}>
              <HoverCardTrigger asChild>
                <span
                  role="button"
                  tabIndex={0}
                  className="cursor-pointer rounded-[4px] font-medium transition-all hover:brightness-110"
                  style={{
                    backgroundColor: colors.bg,
                    borderBottom: `2.5px solid ${colors.border}`,
                    padding: "1px 4px",
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSelectedAsset(frag.asset);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedAsset(frag.asset);
                    }
                  }}
                >
                  {frag.text}
                </span>
              </HoverCardTrigger>
              <HoverCardContent
                className="w-[320px] max-w-[calc(100vw-2rem)] p-3 glass shadow-dream"
                side="top"
                sideOffset={10}
              >
                <div className="space-y-2.5">
                  {frag.asset.image_url && (
                    <div className="w-full max-w-full min-h-[160px] flex items-center justify-center rounded-lg border border-border/50 bg-muted/20 overflow-hidden">
                      <img
                        src={frag.asset.image_url}
                        alt={frag.asset.name}
                        className="max-w-full max-h-[220px] w-auto h-auto object-contain"
                      />
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-base font-semibold">{frag.asset.name}</p>
                    <span
                      className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full shrink-0"
                      style={{
                        backgroundColor: colors.tagBg,
                        color: colors.tagText,
                      }}
                    >
                      {colors.label}
                    </span>
                  </div>
                </div>
              </HoverCardContent>
            </HoverCard>
          );
        })}
      </div>

      {/* Menu flottant de sélection de texte */}
      {selectionMenu && onCreateAsset && (
        <TextSelectionMenu
          selection={selectionMenu}
          onCreateAsset={onCreateAsset}
          onClose={closeSelectionMenu}
        />
      )}

      {/* Popup détail asset au clic */}
      <Dialog open={!!selectedAsset} onOpenChange={(open) => !open && setSelectedAsset(null)}>
        <DialogContent className="glass max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="sr-only">Détail de l'asset</DialogTitle>
          </DialogHeader>
          {selectedAsset && (
            <div className="space-y-4 overflow-auto">
              {selectedAsset.image_url && (
                <div className="w-full flex items-center justify-center rounded-lg border border-border/50 bg-muted/20 overflow-hidden min-h-[200px]">
                  <img
                    src={selectedAsset.image_url}
                    alt={selectedAsset.name}
                    className="max-w-full max-h-[60vh] w-auto h-auto object-contain"
                  />
                </div>
              )}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="text-xl font-semibold">{selectedAsset.name}</p>
                <span
                  className="inline-block text-sm font-semibold px-3 py-1 rounded-full shrink-0"
                  style={{
                    backgroundColor:
                      (ASSET_COLORS[selectedAsset.asset_type] ?? DEFAULT_COLOR).tagBg,
                    color: (ASSET_COLORS[selectedAsset.asset_type] ?? DEFAULT_COLOR).tagText,
                  }}
                >
                  {(ASSET_COLORS[selectedAsset.asset_type] ?? DEFAULT_COLOR).label}
                </span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
