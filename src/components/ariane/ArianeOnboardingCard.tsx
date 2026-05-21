import { useState, useEffect, useRef, useLayoutEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import arianeCharacterUrl from "@/assets/Ariane_Nero_AI_Background_Remover_transparent.png";
import {
  SpeechBubbleShape,
  SPEECH_BUBBLE_VIEWBOX_NARRATION,
} from "@/components/chapter/SpeechBubbleShape";
import { layoutSpeechBubbleNoTailTextRect } from "@/components/chapter/speechBubbleTextAreaLayout";
import {
  ARIANE_WELCOME_REPLAY_EVENT,
} from "@/constants/ariane";
import { useAuth } from "@/hooks/useAuth";
import { ArianeGlyph } from "./ArianeGlyph";
import {
  ARIANE_BUBBLE_CONTENT_REVEAL_DELAY_MS,
  ARIANE_FOCUS_AFTER_REVEAL_MS,
  ARIANE_BUBBLE_BOX_ENTER_INITIAL,
  ARIANE_BUBBLE_BOX_ENTER_TRANSITION,
  ARIANE_BACKDROP_ENTER_TRANSITION,
  ARIANE_CHARACTER_ENTER_TRANSITION,
  ARIANE_OVERLAY_EXIT_S,
  ARIANE_SIGNATURE_ENTER_TRANSITION,
  arianeBubbleTextItem,
  arianeBubbleTextVariants,
  arianeShellRootTransition,
} from "./arianeOverlayMotion";
import { cn } from "@/lib/utils";

const STORAGE_KEY_PREFIX = "dw.ariane_onboarding_v1_dismissed";

export type ArianeOnboardingCardProps = {
  className?: string;
};

export function ArianeOnboardingCard({ className }: ArianeOnboardingCardProps) {
  const { user } = useAuth();
  // Clé par utilisateur : évite que le flag d'un compte supprimé bloque l'onboarding d'un nouveau compte
  const storageKey = user?.id ? `${STORAGE_KEY_PREFIX}_${user.id}` : null;
  const [welcomeReplayEpoch, setWelcomeReplayEpoch] = useState(0);
  const [open, setOpen] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [revealBubbleText, setRevealBubbleText] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const dismissBtnRef = useRef<HTMLButtonElement>(null);
  const bubbleBoxRef = useRef<HTMLDivElement>(null);
  const exitingRef = useRef(false);
  const exitFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [bubbleGeom, setBubbleGeom] = useState({ width: 0, height: 0 });

  const clearExitFallback = () => {
    if (exitFallbackTimerRef.current != null) {
      clearTimeout(exitFallbackTimerRef.current);
      exitFallbackTimerRef.current = null;
    }
  };

  const handleRootAnimationComplete = () => {
    if (!exitingRef.current) return;
    clearExitFallback();
    exitingRef.current = false;
    try {
      if (storageKey) localStorage.setItem(storageKey, "1");
    } catch {
      /* ignore */
    }
    setExiting(false);
    setOpen(false);
  };

  const dismiss = () => {
    if (exiting) return;
    clearExitFallback();
    exitingRef.current = true;
    setExiting(true);
    exitFallbackTimerRef.current = setTimeout(() => {
      exitFallbackTimerRef.current = null;
      if (exitingRef.current) handleRootAnimationComplete();
    }, ARIANE_OVERLAY_EXIT_S * 1000 + 180);
  };

  useEffect(() => {
    const onReplay = () => setWelcomeReplayEpoch((n) => n + 1);
    window.addEventListener(ARIANE_WELCOME_REPLAY_EVENT, onReplay);
    return () => window.removeEventListener(ARIANE_WELCOME_REPLAY_EVENT, onReplay);
  }, []);

  useEffect(() => {
    if (welcomeReplayEpoch > 0) {
      clearExitFallback();
      setOpen(true);
      setExiting(false);
      exitingRef.current = false;
      return;
    }
    if (!storageKey) {
      setOpen(false);
      return;
    }
    try {
      setOpen(localStorage.getItem(storageKey) !== "1");
    } catch {
      setOpen(true);
    }
  }, [welcomeReplayEpoch, storageKey]);

  useEffect(() => {
    if (!open) {
      setRevealBubbleText(false);
      return;
    }
    setRevealBubbleText(false);
    const t = window.setTimeout(
      () => setRevealBubbleText(true),
      ARIANE_BUBBLE_CONTENT_REVEAL_DELAY_MS
    );
    return () => window.clearTimeout(t);
  }, [open, welcomeReplayEpoch]);

  useLayoutEffect(() => {
    if (!open) return;
    const el = bubbleBoxRef.current;
    if (!el) return;
    const sync = () => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        setBubbleGeom({ width: r.width, height: r.height });
      }
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!open || !revealBubbleText) return;
    const t = window.setTimeout(() => dismissBtnRef.current?.focus(), ARIANE_FOCUS_AFTER_REVEAL_MS);
    return () => window.clearTimeout(t);
  }, [open, revealBubbleText]);

  useEffect(
    () => () => {
      if (exitFallbackTimerRef.current != null) {
        clearTimeout(exitFallbackTimerRef.current);
        exitFallbackTimerRef.current = null;
      }
    },
    []
  );

  const bubbleLayout = useMemo(() => {
    const w = bubbleGeom.width > 0 ? bubbleGeom.width : 810;
    const h = bubbleGeom.height > 0 ? bubbleGeom.height : 630;
    return layoutSpeechBubbleNoTailTextRect({ width: w, height: h });
  }, [bubbleGeom.width, bubbleGeom.height]);

  if (!open) return null;

  const bubbleFill = "hsl(var(--card) / 0.93)";
  const bubbleStroke = "hsl(var(--lavender) / 0.55)";
  const strokeW = 2.5;

  const bubbleSvg = (
    <svg
      className="pointer-events-none absolute left-0 w-full"
      style={{ top: bubbleLayout.svgTopOffset, height: bubbleLayout.svgH }}
      viewBox={SPEECH_BUBBLE_VIEWBOX_NARRATION}
      preserveAspectRatio="none"
      overflow="visible"
      aria-hidden
    >
      <SpeechBubbleShape
        type="speech"
        fill={bubbleFill}
        stroke={bubbleStroke}
        strokeWidth={strokeW}
        tailOn={false}
      />
    </svg>
  );

  const bubbleBrandWord = "font-semibold text-[hsl(var(--lavender))]";

  return createPortal(
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ariane-onboarding-heading"
      className={cn(
        "fixed inset-0 z-[200] flex min-h-0 flex-col-reverse md:flex-row md:items-stretch",
        className
      )}
      initial={false}
      animate={
        exiting
          ? { opacity: 0, scale: 1.02, y: 8 }
          : { opacity: 1, scale: 1, y: 0 }
      }
      transition={arianeShellRootTransition(exiting)}
      onAnimationComplete={handleRootAnimationComplete}
    >
      <motion.div
        className="absolute inset-0 bg-background/20 backdrop-blur-2xl supports-[backdrop-filter]:bg-background/15 dark:bg-background/25"
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={ARIANE_BACKDROP_ENTER_TRANSITION}
      />

      <motion.div
        className={cn(
          "pointer-events-none fixed left-0 top-0 z-[210] flex max-w-[min(100%,22rem)] flex-col items-start justify-start md:max-w-[26rem]",
          "pl-[max(1rem,env(safe-area-inset-left,0px))] pr-4",
          "pt-[max(0.75rem,env(safe-area-inset-top,0px))] md:pt-6 lg:pt-8"
        )}
        aria-hidden
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={ARIANE_SIGNATURE_ENTER_TRANSITION}
      >
        <p className="font-display text-left text-2xl font-bold leading-none tracking-tight md:text-3xl lg:text-4xl">
          <span
            className={cn(
              "text-gradient inline-block",
              "[filter:drop-shadow(0_2px_10px_hsl(var(--lavender)/0.5))_drop-shadow(0_1px_2px_hsl(0_0%_0%/0.9))]"
            )}
          >
            Ariane
          </span>
        </p>
        <p
          className={cn(
            "mt-2 max-w-full text-left text-xs font-medium leading-snug text-[hsl(var(--lavender)/0.95)] md:mt-2.5 md:text-sm",
            "[text-shadow:0_1px_4px_hsl(0_0%_0%/0.95),0_0_20px_hsl(var(--lavender)/0.25)]"
          )}
        >
          Votre guide sur le fil du récit
        </p>
      </motion.div>

      <div
        className={cn(
          "relative z-10 flex min-h-0 flex-1 flex-col justify-end md:h-[100dvh] md:flex-none md:shrink-0",
          "w-full md:w-[min(46vw,520px)] lg:w-[min(42vw,560px)]",
          "px-3 pt-6 md:pl-0 md:pr-0 lg:pl-1",
          "md:-ml-3 lg:-ml-5 xl:-ml-6",
          "pb-[max(0px,env(safe-area-inset-bottom,0px))]"
        )}
      >
        <motion.div
          className={cn(
            "relative flex min-h-0 w-full flex-1 flex-col justify-end",
            "items-center md:items-start",
            "md:-translate-x-7 lg:-translate-x-11 xl:-translate-x-[3.75rem] 2xl:-translate-x-[4.5rem]"
          )}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={ARIANE_CHARACTER_ENTER_TRANSITION}
        >
          {imgFailed ? (
            <ArianeGlyph className="mb-0 h-40 w-40 shrink-0 translate-y-4 text-[hsl(var(--lavender))] md:h-56 md:w-56 md:translate-y-10" />
          ) : (
            <img
              src={arianeCharacterUrl}
              alt="Ariane, guide DreamWeave"
              width={720}
              height={900}
              className={cn(
                "h-auto max-h-[min(82dvh,920px)] w-auto max-w-[min(90vw,520px)] shrink-0 object-contain object-bottom object-left select-none",
                "translate-y-4 md:translate-y-10",
                "md:max-h-[min(98dvh,1040px)] md:max-w-none",
                "drop-shadow-[0_16px_50px_hsl(0_0%_0%_/0.4)] dark:drop-shadow-[0_20px_60px_hsl(0_0%_0%_/0.55)]"
              )}
              decoding="async"
              onError={() => setImgFailed(true)}
            />
          )}
        </motion.div>
      </div>

      <div className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center w-full px-4 pb-8 pt-3 md:px-6 md:py-8 lg:px-8">
        <motion.div
          ref={bubbleBoxRef}
          className={cn(
            "relative mx-auto w-full max-w-[min(100%,63rem)] overflow-visible",
            "translate-x-3 md:translate-x-7 lg:translate-x-10"
          )}
          initial={ARIANE_BUBBLE_BOX_ENTER_INITIAL}
          animate={{ opacity: 1, scale: 1 }}
          transition={ARIANE_BUBBLE_BOX_ENTER_TRANSITION}
        >
          {bubbleSvg}
          <div
            className={cn(
              "relative z-10 flex min-h-[min(25.5rem,51dvh)] max-h-[min(191.25dvh,94.5rem)] w-full flex-col items-center justify-center overflow-x-hidden overflow-y-auto overscroll-contain",
              "p-10 md:p-12",
              "pointer-events-auto [overflow-wrap:anywhere]"
            )}
          >
            <motion.div
              className={cn(
                "flex w-full min-w-0 max-w-2xl flex-col items-center justify-center gap-5 text-center md:gap-6",
                "text-sm md:text-[0.9375rem] leading-[1.45] break-words [overflow-wrap:anywhere] text-foreground/90"
              )}
              variants={arianeBubbleTextVariants}
              initial="hidden"
              animate={revealBubbleText ? "show" : "hidden"}
            >
              <motion.h2
                id="ariane-onboarding-heading"
                className="font-display w-full shrink-0 text-center text-lg font-bold leading-tight tracking-tight text-foreground md:text-xl"
                variants={arianeBubbleTextItem}
              >
                Bienvenue sur{" "}
                <span className={cn(bubbleBrandWord)}>DreamWeave</span>
              </motion.h2>
              <motion.span
                className="block w-full text-pretty text-muted-foreground"
                variants={arianeBubbleTextItem}
              >
                Je suis <span className={cn(bubbleBrandWord)}>Ariane</span>, votre guide.
              </motion.span>
              <motion.span
                className="mt-2 block w-full text-pretty text-muted-foreground md:mt-2.5"
                variants={arianeBubbleTextItem}
              >
                Je suis là pour vous aider à comprendre comment{" "}
                <span className={cn(bubbleBrandWord)}>DreamWeave</span> s’articule autour de votre création :
                Webtoons, Mangas et bien d’autres&nbsp;!
              </motion.span>
              <motion.span
                className="mt-2 block w-full text-pretty text-muted-foreground md:mt-2.5"
                variants={arianeBubbleTextItem}
              >
                Vous définissez le <strong className="font-semibold text-foreground">Style</strong>, posez les règles de votre{" "}
                <strong className="font-semibold text-foreground">Univers</strong>, créez vos{" "}
                <strong className="font-semibold text-foreground">Assets</strong>, écrivez votre{" "}
                <strong className="font-semibold text-foreground">Scénario</strong>, puis composez vos chapitres grâce à
                l’<strong className="font-semibold text-foreground">Édition</strong>.
              </motion.span>
              <motion.div
                className={cn(
                  "relative z-20 flex w-full shrink-0 justify-center",
                  "pb-[max(0px,env(safe-area-inset-bottom,0px))]"
                )}
                variants={arianeBubbleTextItem}
              >
                <Button
                  ref={dismissBtnRef}
                  type="button"
                  size="default"
                  disabled={exiting}
                  className="h-11 w-full min-w-[200px] gradient-primary text-primary-foreground shadow-dream transition-[box-shadow,transform] duration-200 ease-out hover:shadow-glow hover:scale-[1.02] active:scale-[0.98] motion-reduce:transition-shadow motion-reduce:hover:scale-100 md:h-10 md:w-auto"
                  onClick={() => {
                    if (exiting) return;
                    dismiss();
                  }}
                >
                  C’est parti
                </Button>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </motion.div>,
    document.body
  );
}
