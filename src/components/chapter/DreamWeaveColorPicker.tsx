import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const PRESET_SWATCHES = [
  { label: "Blanc", color: "#ffffff" },
  { label: "Noir", color: "#000000" },
  { label: "Rouge", color: "#ef4444" },
  { label: "Bleu", color: "#3b82f6" },
  { label: "Vert", color: "#22c55e" },
  { label: "Jaune", color: "#fbbf24" },
  { label: "Lavande", color: "#a78bfa" },
  { label: "Menthe", color: "#34d399" },
] as const;

/** Métadonnées pour enregistrer l’undo une seule fois pendant un glisser SV / teinte. */
export type CanvasColorFillPickMeta =
  | undefined
  | { live: true; phase: "begin" | "adjust" };

function normalizeHexInput(hex: string): string {
  const t = hex.trim();
  const m3 = /^#([0-9a-f]{3})$/i.exec(t);
  if (m3) {
    const c = m3[1];
    return `#${c[0]}${c[0]}${c[1]}${c[1]}${c[2]}${c[2]}`.toLowerCase();
  }
  const m6 = /^#([0-9a-f]{6})$/i.exec(t);
  if (m6) return `#${m6[1]}`.toLowerCase();
  return "#808080";
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const full = normalizeHexInput(hex);
  const m = /^#([0-9a-f]{6})$/.exec(full);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (x: number) => Math.max(0, Math.min(255, Math.round(x)));
  const to = (x: number) => clamp(x).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d > 1e-6) {
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  h *= 360;
  const s = max < 1e-6 ? 0 : d / max;
  const v = max;
  return { h, s, v };
}

function hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
  const c = v * s;
  const hh = ((h % 360) + 360) % 360;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = v - c;
  let rp = 0,
    gp = 0,
    bp = 0;
  if (hh < 60) [rp, gp, bp] = [c, x, 0];
  else if (hh < 120) [rp, gp, bp] = [x, c, 0];
  else if (hh < 180) [rp, gp, bp] = [0, c, x];
  else if (hh < 240) [rp, gp, bp] = [0, x, c];
  else if (hh < 300) [rp, gp, bp] = [x, 0, c];
  else [rp, gp, bp] = [c, 0, x];
  return { r: (rp + m) * 255, g: (gp + m) * 255, b: (bp + m) * 255 };
}

function hexToHsv(hex: string): { h: number; s: number; v: number } {
  const rgb = hexToRgb(hex);
  if (!rgb) return { h: 0, s: 1, v: 1 };
  return rgbToHsv(rgb.r, rgb.g, rgb.b);
}

function hsvToHex(h: number, s: number, v: number): string {
  const { r, g, b } = hsvToRgb(h, s, v);
  return rgbToHex(r, g, b);
}

type Props = {
  value: string;
  onChange: (hex: string, meta?: CanvasColorFillPickMeta) => void;
  /** Fin de geste SV ou teinte (relâche du clic) ; réinitialise le marqueur undo côté page. */
  onLivePickEnd?: () => void;
  className?: string;
};

/**
 * Sélecteur couleur in-app (sans `input type="color"` / dialogue OS).
 */
export function DreamWeaveColorPicker({ value, onChange, onLivePickEnd, className }: Props) {
  const [{ h, s, v }, setHsv] = useState(() => hexToHsv(normalizeHexInput(value)));
  /** Toujours le dernier HSV rendu ; évite des s/v périmées pendant un slide teinte très rapide. */
  const hsvSnapRef = useRef({ h, s, v });
  hsvSnapRef.current = { h, s, v };

  const svRef = useRef<HTMLDivElement | null>(null);
  const draggingSv = useRef(false);
  /** Slide teinte actif ; évite plusieurs « begin » / listeners window en doublon. */
  const hueSlideActiveRef = useRef(false);
  /** Évite que le flux contrôlé depuis le parent réécrase h/s/v pendant un glisser. */
  const interactionLockedRef = useRef(false);

  useEffect(() => {
    if (interactionLockedRef.current) return;
    setHsv(hexToHsv(normalizeHexInput(value)));
  }, [value]);

  const commitHex = useCallback(
    (next: { h: number; s: number; v: number }, meta?: CanvasColorFillPickMeta) => {
      setHsv(next);
      onChange(hsvToHex(next.h, next.s, next.v), meta);
    },
    [onChange],
  );

  const updateSvFromClient = useCallback(
    (clientX: number, clientY: number, phase: "begin" | "adjust") => {
      const el = svRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const ns = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
      const nv = Math.max(0, Math.min(1, 1 - (clientY - r.top) / r.height));
      const ch = hsvSnapRef.current.h;
      commitHex({ h: ch, s: ns, v: nv }, { live: true, phase });
    },
    [commitHex],
  );

  const onSvPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    const surface = svRef.current;
    if (!surface) return;
    surface.setPointerCapture(e.pointerId);
    interactionLockedRef.current = true;
    draggingSv.current = true;
    updateSvFromClient(e.clientX, e.clientY, "begin");
  };

  const onSvPointerMove = (e: React.PointerEvent) => {
    if (!draggingSv.current) return;
    e.preventDefault();
    updateSvFromClient(e.clientX, e.clientY, "adjust");
  };

  const onSvPointerUp = (e: React.PointerEvent) => {
    const surface = svRef.current;
    if (surface?.hasPointerCapture(e.pointerId)) {
      try {
        surface.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }
    draggingSv.current = false;
    if (interactionLockedRef.current) {
      interactionLockedRef.current = false;
      onLivePickEnd?.();
    }
  };

  /** Ne pas utiliser setPointerCapture sur la zone teinte : ça casserait le curseur natif du <input type="range">. */
  const finishHueSlide = useCallback(() => {
    hueSlideActiveRef.current = false;
    if (!interactionLockedRef.current) return;
    interactionLockedRef.current = false;
    onLivePickEnd?.();
  }, [onLivePickEnd]);

  const onHueSliderPointerDown = () => {
    if (hueSlideActiveRef.current) return;
    hueSlideActiveRef.current = true;
    interactionLockedRef.current = true;
    const snap = hsvSnapRef.current;
    onChange(hsvToHex(snap.h, snap.s, snap.v), { live: true, phase: "begin" });

    const fin = () => finishHueSlide();
    window.addEventListener("pointerup", fin, { once: true, capture: true });
    window.addEventListener("pointercancel", fin, { once: true, capture: true });
  };

  const applyHueFromRange = useCallback(
    (nh: number) => {
      const { s: cs, v: cv } = hsvSnapRef.current;
      commitHex({ h: nh, s: cs, v: cv }, { live: true, phase: "adjust" });
    },
    [commitHex],
  );

  const pureHue = hsvToHex(h, 1, 1);
  const knobLeft = `${s * 100}%`;
  const knobTop = `${(1 - v) * 100}%`;

  return (
    <div className={cn("w-[240px] space-y-3 select-none", className)}>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
          Nuance & luminosité
        </p>
        <div
          ref={svRef}
          role="application"
          aria-label="Choisir saturation et luminosité"
          tabIndex={0}
          onPointerDown={onSvPointerDown}
          onPointerMove={onSvPointerMove}
          onPointerUp={onSvPointerUp}
          onPointerCancel={onSvPointerUp}
          className="relative h-[140px] w-full cursor-crosshair rounded-xl border border-border/80 overflow-hidden shadow-inner ring-1 ring-black/[0.06] touch-none"
          style={{
            backgroundColor: pureHue,
            backgroundImage:
              "linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent)",
          }}
        >
          <div
            className="pointer-events-none absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md ring-1 ring-black/40"
            style={{ left: knobLeft, top: knobTop }}
          />
        </div>
      </div>

      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
          Teinte
        </p>
        <div className="relative pt-0.5 pb-1">
          <div
            aria-hidden
            className="pointer-events-none absolute left-0 right-0 top-1/2 h-2.5 -translate-y-1/2 rounded-full border border-border/60 shadow-inner"
            style={{
              background:
                "linear-gradient(90deg,#f00 0%,#ff0 17%,#0f0 33%,#0ff 50%,#00f 67%,#f0f 83%,#f00 100%)",
            }}
          />
          <input
            type="range"
            min={0}
            max={359}
            step={1}
            value={Math.round(h)}
            aria-label="Teinte"
            onPointerDown={onHueSliderPointerDown}
            onInput={(e) => applyHueFromRange(Number((e.target as HTMLInputElement).value))}
            onChange={(e) => applyHueFromRange(Number(e.target.value))}
            className={cn(
              "relative z-10 w-full cursor-pointer appearance-none bg-transparent h-8",
              "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-background [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:ring-1 [&::-webkit-slider-thumb]:ring-black/25",
              "[&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-background [&::-moz-range-thumb]:shadow-md",
              "[&::-webkit-slider-runnable-track]:h-2.5 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-transparent",
              "[&::-moz-range-track]:h-2.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-transparent",
            )}
          />
        </div>
      </div>

      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
          Raccourcis
        </p>
        <div className="flex flex-wrap gap-1.5">
          {PRESET_SWATCHES.map((p) => (
            <button
              key={p.color}
              type="button"
              title={p.label}
              onClick={() => {
                interactionLockedRef.current = false;
                onChange(p.color);
              }}
              className={cn(
                "h-7 w-7 rounded-lg border border-border/80 shadow-sm transition-transform hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--lavender))] focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                p.color === "#ffffff" && "ring-1 ring-slate-300/80",
              )}
              style={{ backgroundColor: p.color }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
