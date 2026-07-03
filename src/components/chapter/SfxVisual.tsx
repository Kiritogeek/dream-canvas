import type { CSSProperties } from "react";
import type { SfxBlock } from "@/types";
import { buildSfxTextShadow } from "@/components/chapter/sfxSystemStyle";

/**
 * Rendu pur d'un bloc SFX — partagé entre le layer éditeur et l'export hors écran
 * (WYSIWYG garanti). CSS limité au sous-ensemble supporté par html2canvas :
 * transform rotate, text-shadow, flex. Pas de filter ni de -webkit-text-stroke.
 */
export function SfxVisual({ sfx }: { sfx: SfxBlock }) {
  const style: CSSProperties = {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    whiteSpace: "pre-line",
    fontFamily: sfx.fontFamily,
    fontSize: sfx.fontSize,
    lineHeight: 1.05,
    color: sfx.color,
    letterSpacing: sfx.letterSpacing ? `${sfx.letterSpacing}px` : undefined,
    textShadow: buildSfxTextShadow(sfx) || undefined,
    transform: `rotate(${sfx.rotation}deg)`,
    transformOrigin: "center center",
    opacity: sfx.opacity ?? 1,
    userSelect: "none",
    overflow: "visible",
  };
  return <div style={style}>{sfx.text}</div>;
}
