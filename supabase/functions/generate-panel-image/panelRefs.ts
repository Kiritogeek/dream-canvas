// Logique pure de construction du plan de références FLUX pour une case.
// Extraite d'index.ts pour être testable côté vitest (aucune dépendance Deno).
//
// C6 (audit 2026-06-27) : les noms et URLs d'assets étaient construits puis
// tronqués séparément → un nom pouvait être associé à la mauvaise image.
// Ici tout est traité en PAIRES {name, url}, tronquées ensemble, et l'ordre
// des paires EST l'ordre réel d'envoi à FLUX (identité → style → continuité).

export interface IdentityPair {
  name: string;
  url: string;
}

export interface ReferencePlanInput {
  /** Nouveau champ body `block_assets` : paires alignées — prioritaire si présent. */
  blockAssets?: unknown;
  /** Rétrocompat : `block_asset_names` (appairé par index avec les URLs). */
  blockAssetNames?: unknown;
  /** Rétrocompat : `block_asset_image_urls`. */
  blockAssetImageUrls?: unknown;
  /** Images de style du projet (déjà filtrées ; vide si preset manga). */
  styleImageUrls: string[];
  previousImageUrl: string | null;
  /** Budget total de références FLUX (5). */
  maxRefs: number;
  /** Plafond d'images de style — priorité aux références d'identité. */
  maxStyleRefs?: number;
}

export interface ReferencePlan {
  /** Paires identité dans l'ordre réel d'envoi à FLUX (images 1..P). */
  identityPairs: IdentityPair[];
  /** Noms sans image utilisable ou tronqués faute de budget — mention texte uniquement. */
  textOnlyAssetNames: string[];
  /** Images de style envoyées (images P+1..P+S). */
  styleRefsUsed: string[];
  /** Image de continuité (toujours en DERNIER : le prompt la référence comme telle). */
  previousImageUrl: string | null;
  /** Liste finale `image_urls` envoyée à FLUX. */
  imageUrls: string[];
}

const DEFAULT_MAX_STYLE_REFS = 2;

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function parsePairs(input: ReferencePlanInput): {
  pairs: IdentityPair[];
  orphanNames: string[];
} {
  const pairs: IdentityPair[] = [];
  const orphanNames: string[] = [];

  if (Array.isArray(input.blockAssets) && input.blockAssets.length > 0) {
    for (const entry of input.blockAssets) {
      if (entry == null || typeof entry !== "object") continue;
      const { name, url } = entry as { name?: unknown; url?: unknown };
      const cleanName = isNonEmptyString(name) ? name.trim() : "";
      if (isNonEmptyString(url)) {
        pairs.push({ name: cleanName, url: url.trim() });
      } else if (cleanName) {
        orphanNames.push(cleanName);
      }
    }
    return { pairs, orphanNames };
  }

  // Rétrocompat : appariement par index BRUT (le client construit les deux
  // listes depuis le même tableau source, donc l'index i correspond).
  const names = Array.isArray(input.blockAssetNames) ? input.blockAssetNames : [];
  const urls = Array.isArray(input.blockAssetImageUrls) ? input.blockAssetImageUrls : [];
  const maxLen = Math.max(names.length, urls.length);
  for (let i = 0; i < maxLen; i++) {
    const name = isNonEmptyString(names[i]) ? (names[i] as string).trim() : "";
    const url = urls[i];
    if (isNonEmptyString(url)) {
      pairs.push({ name, url: url.trim() });
    } else if (name) {
      orphanNames.push(name);
    }
  }
  return { pairs, orphanNames };
}

export function buildReferencePlan(input: ReferencePlanInput): ReferencePlan {
  const { pairs, orphanNames } = parsePairs(input);
  const previousImageUrl = isNonEmptyString(input.previousImageUrl)
    ? input.previousImageUrl.trim()
    : null;

  // Budget FLUX : identité D'ABORD, puis 1-2 images de style, puis la
  // continuité EN DERNIER (slot réservé avant troncature des assets).
  const reservedForPrev = previousImageUrl ? 1 : 0;
  const assetSlots = Math.max(0, input.maxRefs - reservedForPrev);
  const identityPairs = pairs.slice(0, assetSlots);
  const truncatedNames = pairs
    .slice(assetSlots)
    .map((p) => p.name)
    .filter((n) => n.length > 0);

  const maxStyleRefs = input.maxStyleRefs ?? DEFAULT_MAX_STYLE_REFS;
  const styleSlots = Math.max(0, input.maxRefs - identityPairs.length - reservedForPrev);
  const styleRefsUsed = input.styleImageUrls.slice(0, Math.min(maxStyleRefs, styleSlots));

  return {
    identityPairs,
    textOnlyAssetNames: [...orphanNames, ...truncatedNames],
    styleRefsUsed,
    previousImageUrl,
    imageUrls: [
      ...identityPairs.map((p) => p.url),
      ...styleRefsUsed,
      ...(previousImageUrl ? [previousImageUrl] : []),
    ],
  };
}

// Hints anatomie (audit 2026-06-27 : « mains à la place des pieds ») —
// adaptés au cadrage : les plans larges exposent mains/pieds, les close-ups
// exposent le visage. Mots-clés en anglais (vocabulaire natif FLUX).
const ANATOMY_WIDE =
  "correct human anatomy, well-formed hands and feet, natural body proportions, anatomically coherent full-body pose";
const ANATOMY_CLOSE =
  "coherent facial anatomy, well-proportioned facial features, natural symmetrical eyes";
const ANATOMY_DEFAULT =
  "correct human anatomy, well-formed hands, natural proportions";

const WIDE_SHOT_TYPES = new Set([
  "long_shot",
  "full_shot",
  "full_body",
  "wide",
  "wide_shot",
]);
const CLOSE_SHOT_TYPES = new Set([
  "close_up",
  "closeup",
  "extreme_close_up",
  "big_close_up",
  "medium_close_up",
  "portrait",
  "face",
]);

// Inférence depuis scene_type quand shot_type absent (cf. SCENE_TYPE_FLUX_PREFIX).
const WIDE_SCENE_TYPES = new Set([
  "action_melee",
  "power_display",
  "isolation_vulnerability",
]);
const CLOSE_SCENE_TYPES = new Set([
  "dialogue",
  "internal_monologue",
  "reaction_revelation",
  "memory_flashback",
]);
// Scènes sans personnage proche : un hint anatomie serait du bruit de prompt.
const NO_CHARACTER_SCENE_TYPES = new Set([
  "establishing",
  "revelation_system",
  "text_echo_psychological",
]);

export function buildAnatomyHint(shotType?: string, sceneType?: string): string {
  const shot = (shotType ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (WIDE_SHOT_TYPES.has(shot)) return ANATOMY_WIDE;
  if (CLOSE_SHOT_TYPES.has(shot)) return ANATOMY_CLOSE;

  const scene = (sceneType ?? "").trim();
  if (NO_CHARACTER_SCENE_TYPES.has(scene)) return "";
  if (WIDE_SCENE_TYPES.has(scene)) return ANATOMY_WIDE;
  if (CLOSE_SCENE_TYPES.has(scene)) return ANATOMY_CLOSE;
  return ANATOMY_DEFAULT;
}
