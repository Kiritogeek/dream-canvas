// ═══════════════════════════════════════════════════════════════
// ScenarioTextHighlighter — Surligne les assets existants (hover = image)
// + surligne en ambre les éléments non créés détectés
// + panneau « éléments non créés » avec hover → créer comme asset
// ═══════════════════════════════════════════════════════════════

import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { Plus, UserRound, Image, Package, Ban } from "lucide-react";
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
  /** Masquer la ligne d'indication (« X assets détectés » / « Aucun asset détecté »). Utile en overlay dans un champ de saisie. */
  hideIndicator?: boolean;
  /** Appelé quand l'utilisateur clique « Créer comme asset » */
  onCreateAsset?: (name: string, type: AssetType) => void;
  /** Noms exclus de la liste « éléments non créés » (ex. après « Ne pas créer ») */
  dismissedMissingNames?: Set<string>;
  /** Appelé quand l'utilisateur clique « Ne pas créer » sur un élément non créé */
  onDismissMissing?: (name: string) => void;
}

// ── Couleurs par type d'asset (charte DreamWeave) ─────────────

const ASSET_COLORS: Record<
  string,
  { bg: string; border: string; label: string; tagBg: string; tagText: string }
> = {
  character: {
    bg: "hsl(var(--lavender) / 0.55)",
    border: "hsl(var(--lavender) / 0.6)",
    label: "Personnage",
    tagBg: "hsl(var(--lavender) / 0.2)",
    tagText: "hsl(var(--lavender) / 1)",
  },
  background: {
    bg: "hsl(var(--mint) / 0.55)",
    border: "hsl(var(--mint) / 0.6)",
    label: "Décor",
    tagBg: "hsl(var(--mint) / 0.2)",
    tagText: "hsl(170 40% 35%)",
  },
  object: {
    bg: "hsl(230 55% 88% / 0.65)",
    border: "hsl(230 50% 55% / 0.65)",
    label: "Objet",
    tagBg: "hsl(230 45% 85% / 0.4)",
    tagText: "hsl(230 45% 35%)",
  },
};

const DEFAULT_COLOR = {
  bg: "hsl(var(--muted) / 0.55)",
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
  "il", "elle", "ils", "elles", "lui", "eux", "nous", "vous", "je", "tu", "on", "ce",
  "moi", "toi", "soi", "ça", "cela", "celui", "celle", "ceux", "celles",
  "ces", "cette", "cet", "mon", "ma", "mes", "ton", "ta", "tes", "son",
  "sa", "ses", "notre", "nos", "votre", "vos", "leur", "leurs",
  "au", "aux", "par", "pour", "avec", "sans", "dans", "sur", "sous",
  "entre", "vers", "chez", "comme", "si", "ne", "pas", "plus", "se",
  "est", "sont", "sera", "été", "être", "avoir", "fait", "font", "vont",
  "tout", "tous", "toute", "toutes", "très", "bien", "aussi", "alors",
  "puis", "quand", "soudain", "pendant", "après", "avant", "depuis", "enfin",
  "encore", "jamais", "toujours", "rien", "personne", "chaque", "autre",
  "même", "peu", "trop", "assez", "beaucoup", "comment", "pourquoi",
  "merci", "bonjour", "bonsoir", "oui", "non", "peut", "doit", "veut",
  "faut", "vient", "prend", "dit", "voix", "yeux", "main", "tête",
  "jour", "nuit", "temps", "fois", "coup", "vie", "mort", "homme",
  "femme", "enfant", "monde", "porte", "maison", "rue", "terre",
  "eau", "air", "feu", "ciel", "iii", "ii", "iv",
  // Verbes à l'impératif / formes qui ressemblent à des noms (dialogue)
  "arrêtez", "donnez", "attends", "attend", "regarde", "écoute", "viens", "prenez", "allez", "taisez",
  // Noms communs souvent en majuscule (début de phrase) — pas des personnages/décors/objets à créer
  "ombre", "ombres", "lumière", "lumières", "silence", "vent", "bruit", "regard", "sourire",
  "monsieur", "madame", "mademoiselle", "docteur", "professeur",
  "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix",
  "onze", "douze", "treize", "quatorze", "quinze", "vingt", "trente", "cent", "mille",
]);

// Seuil de répétition : un mot doit apparaître au moins autant de fois pour être proposé comme asset non créé
const MIN_OCCURRENCES_FOR_MISSING_ASSET = 4;
// Longueur minimale d'un mot pour être candidat (évite les résidus)
const MIN_WORD_LENGTH = 3;

// Regex : mots (lettres accentuées + noms composés avec tiret)
const WORD_REGEX =
  /\b([A-ZÀÁÂÃÄÉÈÊËÏÎÔÙÛÜŸÇa-zàáâãäéèêëïîôùûüÿçœæ]+(?:-[A-ZÀÁÂÃÄÉÈÊËÏÎÔÙÛÜŸÇa-zàáâãäéèêëïîôùûüÿçœæ]+)*)\b/g;

function capitalizeForDisplay(lower: string): string {
  return lower
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join("-");
}

function capitalizeBigram(bigramLower: string): string {
  return bigramLower
    .split(" ")
    .map((w) => capitalizeForDisplay(w))
    .join(" ");
}

/** Mots qui font partie d'un nom d'asset multi-mot (ex. "Marcus", "Blackwood" pour "Marcus Blackwood") → ne pas proposer comme "non créé" */
function getAssetNameParts(assets: Asset[]): Set<string> {
  const parts = new Set<string>();
  for (const a of assets) {
    const name = a.name.trim();
    if (name.includes(" ")) {
      for (const part of name.split(/\s+/)) {
        const p = part.trim().toLowerCase();
        if (p.length >= 2) parts.add(p);
      }
    }
  }
  return parts;
}

export function detectMissingNames(text: string, assets: Asset[]): string[] {
  const assetNames = new Set(assets.map((a) => a.name.trim().toLowerCase()));
  const assetNameParts = getAssetNameParts(assets);
  const candidates = new Set<string>();

  // Liste ordonnée des mots (pour les bigrammes)
  const words = [...text.matchAll(WORD_REGEX)].map((m) => m[1].toLowerCase());

  // Compter les occurrences de chaque mot (normalisé en minuscules)
  const countByWord = new Map<string, number>();
  for (const w of words) {
    if (w.length < MIN_WORD_LENGTH) continue;
    countByWord.set(w, (countByWord.get(w) ?? 0) + 1);
  }

  // Compter les bigrammes (deux mots consécutifs)
  const countByBigram = new Map<string, number>();
  for (let i = 0; i < words.length - 1; i++) {
    const w1 = words[i];
    const w2 = words[i + 1];
    if (w1.length < 2 || w2.length < 2) continue;
    const bigram = `${w1} ${w2}`;
    countByBigram.set(bigram, (countByBigram.get(bigram) ?? 0) + 1);
  }

  // Candidats bigrammes (répétés >= seuil) : on n'ajoute pas si un des deux mots est un stop-word
  // (ex. "la malette" → on propose "malette" seul, pas "La malette")
  for (const [bigramLower, count] of countByBigram) {
    if (count < MIN_OCCURRENCES_FOR_MISSING_ASSET) continue;
    if (assetNames.has(bigramLower)) continue;
    const [p1, p2] = bigramLower.split(" ");
    if (STRUCTURAL.has(p1) || STRUCTURAL.has(p2)) continue;
    if (STOP_WORDS.has(p1) || STOP_WORDS.has(p2)) continue;
    candidates.add(capitalizeBigram(bigramLower));
  }

  // Candidats mots seuls (répétés >= seuil, hors stop-words / structure / assets existants)
  for (const [wordLower, count] of countByWord) {
    if (count < MIN_OCCURRENCES_FOR_MISSING_ASSET) continue;
    if (assetNames.has(wordLower) || STRUCTURAL.has(wordLower) || STOP_WORDS.has(wordLower)) continue;
    if (assetNameParts.has(wordLower)) continue; // prénom/nom d'un personnage existant (ex. Marcus Blackwood)
    const parts = wordLower.split("-");
    if (parts.every((p) => STOP_WORDS.has(p) || STRUCTURAL.has(p))) continue;
    candidates.add(capitalizeForDisplay(wordLower));
  }

  // Retirer les mots seuls qui sont déjà couverts par un bigramme candidat (ex. "riche" quand on a "Homme riche")
  for (const c of candidates) {
    if (c.includes(" ")) {
      for (const part of c.split(" ")) {
        candidates.delete(part);
      }
    }
  }

  // Ne pas proposer un mot qui est le prénom ou nom d'un asset (ex. "Marcus" ou "Blackwood" quand on a l'asset "Marcus Blackwood")
  for (const part of assetNameParts) {
    candidates.delete(capitalizeForDisplay(part));
  }

  return [...candidates].sort();
}

// ── Construction des fragments ────────────────────────────────

interface BuildResult {
  fragments: TextFragment[];
  detectedAssetCount: number;
  missingNames: string[];
}

function buildAllFragments(
  text: string,
  assets: Asset[],
  dismissedMissingNames?: Set<string>
): BuildResult {
  if (!text) {
    return { fragments: [{ type: "plain", text: "" }], detectedAssetCount: 0, missingNames: [] };
  }

  let missingNames = detectMissingNames(text, assets);
  if (dismissedMissingNames?.size) {
    missingNames = missingNames.filter((n) => !dismissedMissingNames!.has(n.toLowerCase()));
  }

  const assetsSorted = [...assets]
    .filter((a) => a.name && a.name.trim().length > 1)
    .sort((a, b) => b.name.length - a.name.length);

  const assetLookup = new Map<string, Asset>();
  for (const a of assetsSorted) {
    assetLookup.set(a.name.trim().toLowerCase(), a);
  }
  // Prénom / nom seul → asset (ex. "Marcus" ou "Blackwood" → personnage "Marcus Blackwood")
  for (const a of assetsSorted) {
    const name = a.name.trim();
    if (name.includes(" ")) {
      for (const part of name.split(/\s+/)) {
        const p = part.trim().toLowerCase();
        if (p && !assetLookup.has(p)) assetLookup.set(p, a);
      }
    }
  }

  const missingLookup = new Map<string, string>();
  for (const name of missingNames) {
    missingLookup.set(name.toLowerCase(), name);
  }

  const assetFullNames = assetsSorted.map((a) => a.name.trim());
  const assetNamePartsForMatch: string[] = [];
  for (const a of assetsSorted) {
    const name = a.name.trim();
    if (name.includes(" ")) {
      for (const part of name.split(/\s+/)) {
        const p = part.trim();
        if (p) assetNamePartsForMatch.push(p);
      }
    }
  }

  const allTerms = [
    ...assetFullNames,
    ...assetNamePartsForMatch,
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
  onDismiss,
  children,
}: {
  name: string;
  onCreateAsset?: (name: string, type: AssetType) => void;
  onDismiss?: (name: string) => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  if (!onCreateAsset && !onDismiss) return <>{children}</>;

  return (
    <HoverCard open={open} onOpenChange={setOpen} openDelay={150} closeDelay={200}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent
        className="w-56 p-3 bg-background border border-border shadow-lg"
        side="top"
        sideOffset={8}
      >
        <div className="space-y-2">
          <p className="text-sm font-semibold">{name}</p>
          {onCreateAsset && (
            <>
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
            </>
          )}
          {onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              className="justify-start gap-2 h-7 text-xs text-muted-foreground hover:text-muted-foreground border-t mt-1 pt-1.5 w-full"
              onClick={() => {
                onDismiss(name);
                setOpen(false);
              }}
            >
              <Ban className="h-3 w-3" />
              Ne pas créer
            </Button>
          )}
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
  /** Noms exclus de la liste (ex. après « Ne pas créer ») */
  dismissedMissingNames?: Set<string>;
  /** Appelé quand l'utilisateur clique « Ne pas créer » */
  onDismiss?: (name: string) => void;
}

export function MissingAssetsPanel({
  text,
  assets,
  onCreateAsset,
  dismissedMissingNames,
  onDismiss,
}: MissingAssetsPanelProps) {
  const allMissing = useMemo(
    () => detectMissingNames(text, assets),
    [text, assets]
  );
  const missing = useMemo(
    () =>
      dismissedMissingNames?.size
        ? allMissing.filter((n) => !dismissedMissingNames.has(n.toLowerCase()))
        : allMissing,
    [allMissing, dismissedMissingNames]
  );

  if (missing.length === 0) return null;

  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-1.5">
      <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
        Personnages / éléments mentionnés non créés comme assets :
      </p>
      <div className="flex flex-wrap gap-1.5">
        {missing.map((name) => (
          <CreateAssetHover
            key={name}
            name={name}
            onCreateAsset={onCreateAsset}
            onDismiss={onDismiss}
          >
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
            <Package className="h-3.5 w-3.5 text-[hsl(230_45%_35%)]" />
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
  hideIndicator,
  onCreateAsset,
  dismissedMissingNames,
  onDismissMissing,
}: ScenarioTextHighlighterProps) {
  const { fragments, detectedAssetCount, missingNames } = useMemo(
    () => buildAllFragments(text, assets, dismissedMissingNames),
    [text, assets, dismissedMissingNames]
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
    <div className={hideIndicator ? undefined : "space-y-2"}>
      {!hideIndicator && (
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
      )}

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
                onDismiss={onDismissMissing}
              >
                <span
                  className="cursor-pointer rounded-[4px] font-medium transition-all"
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
                  className="cursor-pointer rounded-[4px] font-medium transition-all"
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
                className="w-[320px] max-w-[calc(100vw-2rem)] p-3 bg-background border border-border shadow-lg"
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
