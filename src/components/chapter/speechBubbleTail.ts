import type { SpeechBubbleType } from "@/types";

export const TAIL_ELLIPSE: Record<string, { cx: number; cy: number; rx: number; ry: number }> = {
  speech:  { cx: 50, cy: 46, rx: 47, ry: 43 },
  whisper: { cx: 50, cy: 46, rx: 47, ry: 42 },
  cloud:   { cx: 50, cy: 47, rx: 44, ry: 36 },
  wavy:    { cx: 50, cy: 46, rx: 46, ry: 41 },
  sadness: { cx: 50, cy: 44, rx: 47, ry: 40 },
  anger:   { cx: 50, cy: 46, rx: 43, ry: 38 },
};

export const UNIFIED_TAIL_TYPES = new Set(["speech", "whisper", "cloud", "wavy", "sadness", "anger"]);

export function buildUnifiedTailPath(
  cx: number, cy: number, rx: number, ry: number,
  tx: number, ty: number,
  hw: number,
  curve: number
): string {
  const angle = Math.atan2(ty - cy, tx - cx);
  const r = (rx * ry) / Math.sqrt(
    Math.pow(ry * Math.cos(angle), 2) + Math.pow(rx * Math.sin(angle), 2)
  );
  const px = cx + r * Math.cos(angle);
  const py = cy + r * Math.sin(angle);
  const rawDist = Math.hypot(tx - px, ty - py);

  if (rawDist < hw * 1.5) {
    return `M ${cx - rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx + rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx - rx} ${cy} Z`;
  }

  const perp = angle + Math.PI / 2;
  const a1 = Math.atan2((py + hw * Math.sin(perp) - cy) / ry, (px + hw * Math.cos(perp) - cx) / rx);
  const a2 = Math.atan2((py - hw * Math.sin(perp) - cy) / ry, (px - hw * Math.cos(perp) - cx) / rx);
  const eb1x = cx + rx * Math.cos(a1), eb1y = cy + ry * Math.sin(a1);
  const eb2x = cx + rx * Math.cos(a2), eb2y = cy + ry * Math.sin(a2);

  const t1x = rx * Math.sin(a1), t1y = -ry * Math.cos(a1), t1l = Math.hypot(t1x, t1y);
  const t2x = rx * Math.sin(a2), t2y = -ry * Math.cos(a2), t2l = Math.hypot(t2x, t2y);

  const toTipDist = Math.hypot(tx - cx, ty - cy);
  const tDirX = (tx - cx) / toTipDist, tDirY = (ty - cy) / toTipDist;
  const tPerpX = -tDirY, tPerpY = tDirX;

  const cpLBase = Math.min(hw * 0.5, rawDist * 0.18);
  const curveMag = curve * rawDist * 0.007;

  const cp_ax = eb1x + (t1x / t1l) * cpLBase;
  const cp_ay = eb1y + (t1y / t1l) * cpLBase;

  const t_lerp = 0.55;
  const cp_bx = eb1x + (tx - eb1x) * t_lerp + tPerpX * curveMag;
  const cp_by = eb1y + (ty - eb1y) * t_lerp + tPerpY * curveMag;

  const cp_cx = eb2x + (tx - eb2x) * t_lerp + tPerpX * curveMag;
  const cp_cy = eb2y + (ty - eb2y) * t_lerp + tPerpY * curveMag;

  const cp_dx = eb2x - (t2x / t2l) * cpLBase;
  const cp_dy = eb2y - (t2y / t2l) * cpLBase;

  const f = (n: number) => n.toFixed(1);
  return `M ${f(eb1x)} ${f(eb1y)} ` +
    `C ${f(cp_ax)} ${f(cp_ay)}, ${f(cp_bx)} ${f(cp_by)}, ${f(tx)} ${f(ty)} ` +
    `C ${f(cp_cx)} ${f(cp_cy)}, ${f(cp_dx)} ${f(cp_dy)}, ${f(eb2x)} ${f(eb2y)} ` +
    `A ${rx} ${ry} 0 1 0 ${f(eb1x)} ${f(eb1y)} Z`;
}

export function buildTailOnlyPath(
  cx: number, cy: number, rx: number, ry: number,
  tx: number, ty: number,
  hw: number,
  curve: number
): string | null {
  const angle = Math.atan2(ty - cy, tx - cx);
  const r = (rx * ry) / Math.sqrt(
    Math.pow(ry * Math.cos(angle), 2) + Math.pow(rx * Math.sin(angle), 2)
  );
  const px = cx + r * Math.cos(angle);
  const py = cy + r * Math.sin(angle);
  const rawDist = Math.hypot(tx - px, ty - py);

  if (rawDist < hw * 1.5) return null;

  const perp = angle + Math.PI / 2;
  const a1 = Math.atan2((py + hw * Math.sin(perp) - cy) / ry, (px + hw * Math.cos(perp) - cx) / rx);
  const a2 = Math.atan2((py - hw * Math.sin(perp) - cy) / ry, (px - hw * Math.cos(perp) - cx) / rx);
  const eb1x = cx + rx * Math.cos(a1), eb1y = cy + ry * Math.sin(a1);
  const eb2x = cx + rx * Math.cos(a2), eb2y = cy + ry * Math.sin(a2);

  const t1x = rx * Math.sin(a1), t1y = -ry * Math.cos(a1), t1l = Math.hypot(t1x, t1y);
  const t2x = rx * Math.sin(a2), t2y = -ry * Math.cos(a2), t2l = Math.hypot(t2x, t2y);

  const toTipDist = Math.hypot(tx - cx, ty - cy);
  const tDirX = (tx - cx) / toTipDist, tDirY = (ty - cy) / toTipDist;
  const tPerpX = -tDirY, tPerpY = tDirX;

  const cpLBase = Math.min(hw * 0.5, rawDist * 0.18);
  const curveMag = curve * rawDist * 0.007;

  const cp_ax = eb1x + (t1x / t1l) * cpLBase;
  const cp_ay = eb1y + (t1y / t1l) * cpLBase;

  const t_lerp = 0.55;
  const cp_bx = eb1x + (tx - eb1x) * t_lerp + tPerpX * curveMag;
  const cp_by = eb1y + (ty - eb1y) * t_lerp + tPerpY * curveMag;

  const cp_cx = eb2x + (tx - eb2x) * t_lerp + tPerpX * curveMag;
  const cp_cy = eb2y + (ty - eb2y) * t_lerp + tPerpY * curveMag;

  const cp_dx = eb2x - (t2x / t2l) * cpLBase;
  const cp_dy = eb2y - (t2y / t2l) * cpLBase;

  const f = (n: number) => n.toFixed(1);
  return `M ${f(eb1x)} ${f(eb1y)} ` +
    `C ${f(cp_ax)} ${f(cp_ay)}, ${f(cp_bx)} ${f(cp_by)}, ${f(tx)} ${f(ty)} ` +
    `C ${f(cp_cx)} ${f(cp_cy)}, ${f(cp_dx)} ${f(cp_dy)}, ${f(eb2x)} ${f(eb2y)} Z`;
}

export function getTailHitPath(
  type: SpeechBubbleType,
  tailX?: number, tailY?: number, tailFlip?: boolean, tailBaseWidth?: number, tailCurve?: number
): string | null {
  if (!UNIFIED_TAIL_TYPES.has(type)) return null;
  const e = TAIL_ELLIPSE[type];
  if (!e) return null;
  const tx = tailX ?? (tailFlip ? 85 : 15);
  const ty = tailY ?? 115;
  const hw = (tailBaseWidth ?? 28) / 2;
  return buildTailOnlyPath(e.cx, e.cy, e.rx, e.ry, tx, ty, hw, tailCurve ?? 0);
}
