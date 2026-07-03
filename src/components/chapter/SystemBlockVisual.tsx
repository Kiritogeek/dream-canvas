import type { CSSProperties } from "react";
import type { SystemBlock } from "@/types";
import { hexToRgba } from "@/components/chapter/sfxSystemStyle";

const MONO_FONT = "'Roboto Mono', monospace";

/**
 * Rendu pur d'une fenêtre système RPG — partagé entre le layer éditeur et l'export.
 * Contraintes html2canvas : pas de box-shadow ni de filter → la lueur est un halo
 * en radial-gradient, le relief vient des doubles bordures.
 */
export function SystemBlockVisual({ block }: { block: SystemBlock }) {
  const accent = block.accentColor;
  const wrapper: CSSProperties = {
    position: "relative",
    width: "100%",
    height: "100%",
    fontFamily: MONO_FONT,
  };
  const halo: CSSProperties = {
    position: "absolute",
    left: -18, top: -18, right: -18, bottom: -18,
    background: `radial-gradient(ellipse at center, ${hexToRgba(accent, 0.32)} 0%, ${hexToRgba(accent, 0.1)} 55%, transparent 78%)`,
    pointerEvents: "none",
  };
  const box: CSSProperties = {
    position: "absolute",
    inset: 0,
    background: "linear-gradient(180deg, rgba(9, 12, 24, 0.96) 0%, rgba(15, 19, 38, 0.96) 100%)",
    border: `2px solid ${accent}`,
    borderRadius: 8,
    overflow: "hidden",
  };
  const innerBorder: CSSProperties = {
    position: "absolute",
    left: 4, top: 4, right: 4, bottom: 4,
    border: `1px solid ${hexToRgba(accent, 0.35)}`,
    borderRadius: 5,
    pointerEvents: "none",
  };
  const cornerBase: CSSProperties = {
    position: "absolute",
    width: 14,
    height: 14,
    pointerEvents: "none",
  };
  return (
    <div style={wrapper}>
      <div style={halo} />
      <div style={box}>
        <div style={innerBorder} />
        {/* Coins décoratifs (ticks) */}
        <div style={{ ...cornerBase, left: 0, top: 0, borderLeft: `3px solid ${accent}`, borderTop: `3px solid ${accent}` }} />
        <div style={{ ...cornerBase, right: 0, bottom: 0, borderRight: `3px solid ${accent}`, borderBottom: `3px solid ${accent}` }} />
        {block.showClose && (
          <div
            style={{
              position: "absolute",
              top: 7, right: 7,
              width: 20, height: 20,
              borderRadius: 4,
              border: `1px solid ${hexToRgba(accent, 0.7)}`,
              background: hexToRgba(accent, 0.18),
              color: accent,
              fontSize: 12,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              lineHeight: 1,
            }}
          >
            ✕
          </div>
        )}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            padding: "18px 26px",
            gap: 10,
          }}
        >
          {/* En-tête : icône + titre */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {block.showIcon !== false && (
              <div
                style={{
                  width: 22, height: 22,
                  borderRadius: "50%",
                  border: `2px solid ${accent}`,
                  color: accent,
                  fontSize: 13,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  lineHeight: 1,
                  flexShrink: 0,
                }}
              >
                !
              </div>
            )}
            <div
              style={{
                color: accent,
                fontSize: 17,
                fontWeight: 700,
                letterSpacing: 3,
                textTransform: "uppercase",
                textShadow: `0 0 10px ${hexToRgba(accent, 0.85)}`,
                whiteSpace: "nowrap",
              }}
            >
              {block.title}
            </div>
          </div>
          {/* Corps vide = mode bandeau une ligne (notification pleine largeur, Solo Leveling) */}
          {block.body.trim() !== "" && (
            <>
              <div
                style={{
                  width: "72%",
                  height: 1,
                  background: `linear-gradient(90deg, transparent 0%, ${hexToRgba(accent, 0.8)} 50%, transparent 100%)`,
                }}
              />
              <div
                style={{
                  color: "#e2e8f0",
                  fontSize: 15,
                  lineHeight: 1.55,
                  textAlign: "center",
                  whiteSpace: "pre-line",
                  overflow: "hidden",
                  width: "100%",
                }}
              >
                {block.body}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
