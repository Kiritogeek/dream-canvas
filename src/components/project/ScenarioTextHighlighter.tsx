// ═══════════════════════════════════════════════════════════════
// ScenarioTextHighlighter — Surligne les assets existants (hover = image)
// + surligne en ambre les éléments non créés détectés
// + panneau « éléments non créés » avec hover → créer comme asset
// ═══════════════════════════════════════════════════════════════

import { useMemo, useState, useCallback, useRef, useEffect, Fragment } from "react";
import { UserRound, Image, Package, Ban, Link2, X, Sparkles, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
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
  /** Liaisons manuelles mot (lowercase) → asset_id, par chapitre */
  wordMappings?: Record<string, string>;
  /** Appelé pour créer/modifier/supprimer une liaison. assetId=null = supprimer */
  onAssignWord?: (word: string, assetId: string | null) => void;
  /**
   * Noms supplémentaires à traiter comme « à créer » (surlignés ambre + hover Créer),
   * même si le seuil de répétition ne les attrape pas (en-têtes de scène, propositions Ariane).
   */
  extraCreatableNames?: string[];
  /** Appelé quand l'utilisateur clique « Générer » sur un asset existant sans visuel. */
  onGenerateAsset?: (asset: Asset) => void;
  /** Id de l'asset en cours de génération (spinner sur le bouton « Générer »). */
  generatingAssetId?: string | null;
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
    tagBg: "hsl(170 45% 38% / 0.95)",
    tagText: "hsl(0 0% 100%)",
  },
  object: {
    bg: "hsl(230 55% 88% / 0.65)",
    border: "hsl(230 50% 55% / 0.65)",
    label: "Objet",
    tagBg: "hsl(230 55% 42% / 0.95)",
    tagText: "hsl(0 0% 100%)",
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
  | { type: "missing"; text: string; name: string }
  | { type: "mapped"; text: string; asset: Asset; mappedKey: string };

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
        if (p.length >= 2 && !STOP_WORDS.has(p) && !STRUCTURAL.has(p)) parts.add(p);
      }
    }
  }
  return parts;
}

// eslint-disable-next-line react-refresh/only-export-components
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
  dismissedMissingNames?: Set<string>,
  wordMappings?: Record<string, string>,
  extraCreatableNames?: string[]
): BuildResult {
  if (!text) {
    return { fragments: [{ type: "plain", text: "" }], detectedAssetCount: 0, missingNames: [] };
  }

  let missingNames = detectMissingNames(text, assets);

  // Fusionner les noms « à créer » externes (en-têtes de scène, propositions Ariane),
  // dédup insensible casse — sauf s'ils correspondent à un asset existant.
  if (extraCreatableNames?.length) {
    const assetNamesLower = new Set(assets.map((a) => a.name.trim().toLowerCase()));
    const seen = new Set(missingNames.map((n) => n.toLowerCase()));
    for (const raw of extraCreatableNames) {
      const name = raw.trim();
      const lower = name.toLowerCase();
      if (name.length < 2 || assetNamesLower.has(lower) || seen.has(lower)) continue;
      seen.add(lower);
      missingNames.push(name);
    }
  }

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

  const mappedTermLookup = new Map<string, Asset>();
  if (wordMappings) {
    const assetById = new Map(assets.map((a) => [a.id, a]));
    for (const [word, assetId] of Object.entries(wordMappings)) {
      const asset = assetById.get(assetId);
      if (asset && !assetLookup.has(word)) {
        mappedTermLookup.set(word, asset);
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
        if (p && !STOP_WORDS.has(p.toLowerCase()) && !STRUCTURAL.has(p.toLowerCase()) && p.length >= 2) {
          assetNamePartsForMatch.push(p);
        }
      }
    }
  }

  const allTerms = [
    ...assetFullNames,
    ...assetNamePartsForMatch,
    ...[...mappedTermLookup.keys()],
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
    } else if (mappedTermLookup.has(lower)) {
      const mappedAsset = mappedTermLookup.get(lower)!;
      detectedAssetIds.add(mappedAsset.id);
      fragments.push({ type: "mapped", text: part, asset: mappedAsset, mappedKey: lower });
    } else if (missingLookup.has(lower)) {
      fragments.push({ type: "missing", text: part, name: missingLookup.get(lower)! });
    } else {
      fragments.push({ type: "plain", text: part });
    }
  }

  return { fragments, detectedAssetCount: detectedAssetIds.size, missingNames };
}

/** Retourne la liste unique des assets détectés dans le texte (ordre de première occurrence). Seul le nom complet de l'asset compte (pas une partie du nom). */
// eslint-disable-next-line react-refresh/only-export-components
export function getDetectedAssets(text: string, assets: Asset[]): Asset[] {
  if (!text.trim()) return [];
  const withIndex: { asset: Asset; index: number }[] = [];
  for (const asset of assets) {
    const name = asset.name?.trim();
    if (!name || name.length < 2) continue;
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`${NOT_BEFORE}${escaped}${NOT_AFTER}`, "gi");
    const idx = text.search(regex);
    if (idx >= 0) withIndex.push({ asset, index: idx });
  }
  withIndex.sort((a, b) => a.index - b.index);
  const seen = new Set<string>();
  const result: Asset[] = [];
  for (const { asset } of withIndex) {
    if (!seen.has(asset.id)) {
      seen.add(asset.id);
      result.push(asset);
    }
  }
  return result;
}

// ── Bouton « Créer comme asset » dans un HoverCard ───────────

function CreateAssetHover({
  name,
  onCreateAsset,
  onDismiss,
  onAssign,
  children,
}: {
  name: string;
  onCreateAsset?: (name: string, type: AssetType) => void;
  onDismiss?: (name: string) => void;
  onAssign?: (name: string) => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  if (!onCreateAsset && !onDismiss) return <>{children}</>;

  return (
    <HoverCard open={open} onOpenChange={setOpen} openDelay={150} closeDelay={200}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent
        className="w-56 p-3 bg-background border border-border shadow-lg rounded-lg"
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
                  <UserRound className="h-3 w-3 text-[hsl(var(--lavender))]" />
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
                  <Image className="h-3 w-3 text-[hsl(var(--mint))]" />
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
                  <Package className="h-3 w-3 text-[hsl(230_45%_35%)]" />
                  Objet
                </Button>
              </div>
            </>
          )}
          {onAssign && (
            <>
              <div className="border-t border-border/40 mt-1 pt-1" />
              <Button
                variant="ghost"
                size="sm"
                className="justify-start gap-2 h-7 text-xs text-[hsl(var(--lavender))] hover:text-[hsl(var(--lavender))] w-full"
                onClick={() => {
                  onAssign(name);
                  setOpen(false);
                }}
              >
                <Link2 className="h-3 w-3" />
                Lier à un asset existant
              </Button>
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
              <Ban className="h-3 w-3 text-destructive" />
              Ne pas créer
            </Button>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

// ── Menu flottant de sélection de texte ─────────────────────

interface SelectionMenuState {
  text: string;
  x: number;
  y: number;
  showBelow: boolean;
}

function TextSelectionMenu({
  selection,
  onCreateAsset,
  onAssign,
  onClose,
}: {
  selection: SelectionMenuState;
  onCreateAsset: (name: string, type: AssetType) => void;
  onAssign?: (word: string) => void;
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
      className={`fixed z-50 animate-in fade-in-0 zoom-in-95 duration-150 ${selection.showBelow ? "slide-in-from-top-2" : "slide-in-from-bottom-2"}`}
      style={{
        left: `${selection.x}px`,
        top: `${selection.y}px`,
        transform: selection.showBelow ? "translate(-50%, 0)" : "translate(-50%, -100%)",
      }}
    >
      <div className="w-56 p-3 bg-background border border-border shadow-lg rounded-lg space-y-2 min-w-[200px]">
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
        {onAssign && (
          <>
            <div className="border-t border-border/40 my-1" />
            <button
              className="flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-md hover:bg-muted/60 transition-colors text-left w-full text-[hsl(var(--lavender))]"
              onClick={() => {
                onAssign(name);
                onClose();
              }}
            >
              <Link2 className="h-3.5 w-3.5" />
              Lier à un asset existant
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Rendu structuré des fragments plain (context-aware) ──────

type LineStyle = "heading" | "bq-violet" | "bq-cyan" | "separator" | "dialogue" | "plain";

function getLineStyle(line: string): LineStyle {
  if (/^###\s/.test(line)) return "heading";
  if (/^>\s*Personnages\s*:/i.test(line)) return "bq-violet";
  if (/^>\s*/.test(line)) return "bq-cyan";
  if (/^-{3,}\s*$/.test(line)) return "separator";
  if (/«/.test(line)) return "dialogue";
  return "plain";
}

const LINE_STYLE_CSS: Record<LineStyle, React.CSSProperties> = {
  heading:   { color: "hsl(275, 45%, 60%)", fontWeight: 700 },
  "bq-violet": { color: "hsl(275, 38%, 55%)" },
  "bq-cyan": { color: "hsl(170, 40%, 55%)" },
  separator: { color: "hsl(0, 0%, 58%)" },
  dialogue:  { fontStyle: "italic", color: "hsl(275, 22%, 52%)" },
  plain:     { color: "hsl(var(--foreground))" },
};

/**
 * Rend un fragment "plain" en connaissant son offset dans le texte complet.
 * Permet de coloriser correctement les continuations de lignes structurelles
 * (ex : " du rivage" après un asset sur une ligne ### ).
 */
function renderPlainWithContext(
  fragText: string,
  fragIdx: number,
  fullText: string,
  fragOffset: number,
  startLineIdx: number,
  allLines: string[],
  lineStyles: LineStyle[]
): React.ReactNode {
  const parts = fragText.split("\n");
  const isLineStart = fragOffset === 0 || fullText[fragOffset - 1] === "\n";
  const result: React.ReactNode[] = [];

  parts.forEach((part, pi) => {
    const lineIdx = startLineIdx + pi;
    const key = `${fragIdx}-${pi}`;
    const atLineStart = pi > 0 || isLineStart;

    if (atLineStart) {
      const sceneMatch = part.match(/^(###\s)(.*)/s);
      const blockMatch = part.match(/^(>\s*)(.*)/s);
      if (sceneMatch) {
        result.push(
          <span key={key}>
            <span style={{ fontSize: 0 }}>{sceneMatch[1]}</span>
            <span style={LINE_STYLE_CSS.heading}>{sceneMatch[2]}</span>
          </span>
        );
      } else if (blockMatch) {
        const bStyle = /^Personnages\s*:/i.test(blockMatch[2]) ? "bq-violet" : "bq-cyan";
        result.push(
          <span key={key}>
            <span style={{ fontSize: 0 }}>{blockMatch[1]}</span>
            <span style={LINE_STYLE_CSS[bStyle]}>{blockMatch[2]}</span>
          </span>
        );
      } else {
        const s = lineStyles[lineIdx] ?? "plain";
        result.push(<span key={key} style={LINE_STYLE_CSS[s]}>{part}</span>);
      }
    } else {
      // Milieu de ligne : appliquer le style de la ligne d'origine
      const s = lineStyles[lineIdx] ?? "plain";
      result.push(<span key={key} style={LINE_STYLE_CSS[s]}>{part}</span>);
    }

    if (pi < parts.length - 1) result.push("\n");
  });

  void allLines; // utilisé via lineStyles, référence gardée pour la signature
  return <Fragment key={fragIdx}>{result}</Fragment>;
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
  wordMappings,
  onAssignWord,
  extraCreatableNames,
  onGenerateAsset,
  generatingAssetId,
}: ScenarioTextHighlighterProps) {
  const { fragments, detectedAssetCount, missingNames } = useMemo(
    () => buildAllFragments(text, assets, dismissedMissingNames, wordMappings, extraCreatableNames),
    [text, assets, dismissedMissingNames, wordMappings, extraCreatableNames]
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const [selectionMenu, setSelectionMenu] = useState<SelectionMenuState | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [assignDialog, setAssignDialog] = useState<{
    word: string;
    currentAssetId?: string;
  } | null>(null);
  const [assignSearch, setAssignSearch] = useState("");

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

    const HEADER_HEIGHT = 48;
    const POPUP_HEIGHT = 240;
    const POPUP_WIDTH = 224;
    const showBelow = rect.top - HEADER_HEIGHT < POPUP_HEIGHT;
    const clampedX = Math.max(POPUP_WIDTH / 2, Math.min(window.innerWidth - POPUP_WIDTH / 2, rect.left + rect.width / 2));

    setSelectionMenu({
      text: cleaned,
      x: clampedX,
      y: showBelow ? rect.bottom + 8 : rect.top - 8,
      showBelow,
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
        className={className ?? ""}
        style={{ fontFamily: "inherit", fontSize: "1rem", lineHeight: "1.8", whiteSpace: "pre-wrap", wordBreak: "break-word", overflowWrap: "break-word", padding: 0, margin: 0 }}
        onMouseUp={handleMouseUp}
      >
        {(() => {
          const allLines = text.split("\n");
          const lineStyles = allLines.map(getLineStyle);
          let charOffset = 0;
          let lineOffset = 0;
          return fragments.map((frag, i) => {
            const fragOffset = charOffset;
            const fragLineStart = lineOffset;
            charOffset += frag.text.length;
            lineOffset += frag.text.match(/\n/g)?.length ?? 0;

          if (frag.type === "plain") {
            return renderPlainWithContext(frag.text, i, text, fragOffset, fragLineStart, allLines, lineStyles);
          }

          if (frag.type === "missing") {
            return (
              <CreateAssetHover
                key={i}
                name={frag.name}
                onCreateAsset={onCreateAsset}
                onDismiss={onDismissMissing}
                onAssign={onAssignWord ? (name) => {
                  setAssignDialog({ word: name });
                  setAssignSearch("");
                } : undefined}
              >
                <span
                  className="cursor-pointer rounded-[4px] font-medium"
                  style={{
                    backgroundColor: MISSING_COLOR.bg,
                    boxShadow: `inset 0 -2.5px 0 ${MISSING_COLOR.border}`,
                  }}
                >
                  {frag.text}
                </span>
              </CreateAssetHover>
            );
          }

          if (frag.type === "mapped") {
            const colors = ASSET_COLORS[frag.asset.asset_type] ?? DEFAULT_COLOR;
            const isUngeneratedMapped = !frag.asset.image_url;
            return (
              <HoverCard key={i} openDelay={150} closeDelay={150}>
                <HoverCardTrigger asChild>
                  <span
                    role="button"
                    tabIndex={0}
                    className="cursor-pointer rounded-[4px] font-medium"
                    style={{
                      backgroundColor: isUngeneratedMapped ? MISSING_COLOR.bg : colors.bg,
                      boxShadow: `inset 0 -2.5px 0 ${isUngeneratedMapped ? MISSING_COLOR.border : colors.border}`,
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (onAssignWord) {
                        setAssignDialog({
                          word: frag.text,
                          currentAssetId: wordMappings?.[frag.mappedKey],
                        });
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        if (onAssignWord) {
                          setAssignDialog({
                            word: frag.text,
                            currentAssetId: wordMappings?.[frag.mappedKey],
                          });
                        }
                      }
                    }}
                  >
                    {frag.text}
                  </span>
                </HoverCardTrigger>
                <HoverCardContent
                  className="w-[280px] max-w-[calc(100vw-2rem)] p-3 bg-background border border-border shadow-lg"
                  side="top"
                  sideOffset={10}
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Link2 className="h-3 w-3 shrink-0" />
                      <span>Lié à <strong className="text-foreground">{frag.asset.name}</strong></span>
                    </div>
                    {frag.asset.image_url && (
                      <div className="w-full max-w-full min-h-[120px] flex items-center justify-center rounded-lg border border-border/50 bg-muted/20 overflow-hidden">
                        <img
                          src={frag.asset.image_url}
                          alt={frag.asset.name}
                          className="max-w-full max-h-[180px] w-auto h-auto object-contain"
                          loading="lazy"
                          decoding="async"
                        />
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold">{frag.asset.name}</p>
                      <span
                        className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full shrink-0"
                        style={{ backgroundColor: colors.tagBg, color: colors.tagText }}
                      >
                        {colors.label}
                      </span>
                    </div>
                    {onAssignWord && (
                      <p className="text-[10px] text-muted-foreground">Cliquez pour modifier le lien</p>
                    )}
                  </div>
                </HoverCardContent>
              </HoverCard>
            );
          }

          // type === "asset"
          const colors = ASSET_COLORS[frag.asset.asset_type] ?? DEFAULT_COLOR;
          const isUngenerated = !frag.asset.image_url;
          const isGeneratingThis = !!generatingAssetId && generatingAssetId === frag.asset.id;

          return (
            <HoverCard key={i} openDelay={150} closeDelay={150}>
              <HoverCardTrigger asChild>
                <span
                  role="button"
                  tabIndex={0}
                  className="cursor-pointer rounded-[4px] font-medium"
                  style={{
                    backgroundColor: isUngenerated ? MISSING_COLOR.bg : colors.bg,
                    boxShadow: `inset 0 -2.5px 0 ${isUngenerated ? MISSING_COLOR.border : colors.border}`,
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
                  {isUngenerated && (
                    <div className="space-y-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5">
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        Cet asset n'a pas encore de visuel.
                      </p>
                      {onGenerateAsset && (
                        <Button
                          size="sm"
                          className="w-full gap-1.5 h-8 text-xs gradient-primary text-primary-foreground shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-transform"
                          disabled={isGeneratingThis}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onGenerateAsset(frag.asset);
                          }}
                        >
                          {isGeneratingThis ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Sparkles className="h-3.5 w-3.5" />
                          )}
                          Générer
                        </Button>
                      )}
                    </div>
                  )}
                  {frag.asset.image_url && (
                    <div className="w-full max-w-full min-h-[160px] flex items-center justify-center rounded-lg border border-border/50 bg-muted/20 overflow-hidden">
                      <img
                        src={frag.asset.image_url}
                        alt={frag.asset.name}
                        className="max-w-full max-h-[220px] w-auto h-auto object-contain"
                        loading="lazy"
                        decoding="async"
                      />
                    </div>
                  )}
                  {frag.asset.image_url_sheet && (
                    <div className="w-full max-w-full min-h-[90px] flex items-center justify-center rounded-lg border border-border/50 bg-muted/20 overflow-hidden">
                      <img
                        src={frag.asset.image_url_sheet}
                        alt={`${frag.asset.name} - Sheet`}
                        className="max-w-full max-h-[140px] w-auto h-auto object-contain"
                        loading="lazy"
                        decoding="async"
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
        )()}
      </div>

      {/* Menu flottant de sélection de texte */}
      {selectionMenu && onCreateAsset && (
        <TextSelectionMenu
          selection={selectionMenu}
          onCreateAsset={onCreateAsset}
          onAssign={onAssignWord ? (word) => {
            setAssignDialog({ word });
            setAssignSearch("");
          } : undefined}
          onClose={closeSelectionMenu}
        />
      )}

      {/* Dialog liaison manuelle mot → asset */}
      <Dialog
        open={!!assignDialog}
        onOpenChange={(open) => {
          if (!open) {
            setAssignDialog(null);
            setAssignSearch("");
          }
        }}
      >
        <DialogContent className="glass max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-base">
              Lier « {assignDialog?.word} » à un asset
            </DialogTitle>
          </DialogHeader>

          {assignDialog?.currentAssetId &&
            assets.find((a) => a.id === assignDialog.currentAssetId) && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-[hsl(var(--lavender)/0.1)] border border-[hsl(var(--lavender)/0.2)] text-sm">
                <Link2 className="h-3.5 w-3.5 text-[hsl(var(--lavender))] shrink-0" />
                <span className="text-muted-foreground text-xs">Actuellement lié à</span>
                <span className="font-semibold text-xs">
                  {assets.find((a) => a.id === assignDialog.currentAssetId)?.name}
                </span>
              </div>
            )}

          <Input
            value={assignSearch}
            onChange={(e) => setAssignSearch(e.target.value)}
            placeholder="Rechercher un asset…"
            autoFocus
            className="h-8 text-sm"
          />

          <div className="max-h-[220px] overflow-y-auto space-y-0.5">
            {assets
              .filter((a) =>
                a.name.toLowerCase().includes(assignSearch.toLowerCase())
              )
              .map((asset) => {
                const colors = ASSET_COLORS[asset.asset_type] ?? DEFAULT_COLOR;
                const isCurrent = asset.id === assignDialog?.currentAssetId;
                return (
                  <button
                    key={asset.id}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                      isCurrent
                        ? "bg-[hsl(var(--lavender)/0.15)] border border-[hsl(var(--lavender)/0.3)]"
                        : "hover:bg-muted/50"
                    }`}
                    onClick={() => {
                      if (assignDialog) {
                        onAssignWord?.(assignDialog.word.toLowerCase(), asset.id);
                        setAssignDialog(null);
                        setAssignSearch("");
                      }
                    }}
                  >
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: colors.border }}
                    />
                    <span className="flex-1 truncate">{asset.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {colors.label}
                    </span>
                  </button>
                );
              })}
            {assets.filter((a) =>
              a.name.toLowerCase().includes(assignSearch.toLowerCase())
            ).length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">
                Aucun asset trouvé
              </p>
            )}
          </div>

          {assignDialog?.currentAssetId && (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive gap-1.5 self-start"
              onClick={() => {
                if (assignDialog) {
                  onAssignWord?.(assignDialog.word.toLowerCase(), null);
                  setAssignDialog(null);
                  setAssignSearch("");
                }
              }}
            >
              <X className="h-3.5 w-3.5" />
              Supprimer le lien
            </Button>
          )}
        </DialogContent>
      </Dialog>

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
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              )}
              {selectedAsset.image_url_sheet && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Sheet</p>
                  <div className="w-full flex items-center justify-center rounded-lg border border-border/50 bg-muted/20 overflow-hidden min-h-[180px]">
                    <img
                      src={selectedAsset.image_url_sheet}
                      alt={`${selectedAsset.name} - Sheet`}
                      className="max-w-full max-h-[60vh] w-auto h-auto object-contain"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
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
