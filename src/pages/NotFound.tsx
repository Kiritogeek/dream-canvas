import { useEffect, useMemo, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Home, ArrowLeft, Search, Star } from "lucide-react";
import { LogoMark } from "@/components/Logo";
import { Button } from "@/components/ui/button";

const STAR_COLORS = [
  "hsl(var(--lavender))",
  "hsl(var(--peach))",
  "hsl(var(--mint))",
  "hsl(var(--rose))",
];

type StarSpec = {
  top: string;
  left: string;
  size: number;
  color: string;
  delay: number;
  duration: number;
};

// Champ d'étoiles statique (pas de canvas rAF) — twinkle en opacity/transform uniquement.
function useStarfield(count: number): StarSpec[] {
  return useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const seed = (i * 9301 + 49297) % 233280;
        const r = seed / 233280;
        const r2 = ((i * 4093 + 7919) % 233280) / 233280;
        return {
          top: `${(r * 100).toFixed(2)}%`,
          left: `${(r2 * 100).toFixed(2)}%`,
          size: +(r * 2 + 1).toFixed(2),
          color: STAR_COLORS[i % STAR_COLORS.length],
          delay: +(r2 * 4).toFixed(2),
          duration: +(r * 2.5 + 2.5).toFixed(2),
        };
      }),
    [count]
  );
}

const NotFound = () => {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const stageRef = useRef<HTMLDivElement>(null);
  const stars = useStarfield(34);

  // Parallaxe léger au pointeur — interpolé via rAF, transform uniquement, nettoyé au démontage.
  useEffect(() => {
    if (reduceMotion) return;
    const stage = stageRef.current;
    if (!stage) return;

    let target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    let frame = 0;

    const onMove = (e: PointerEvent) => {
      target = {
        x: e.clientX / window.innerWidth - 0.5,
        y: e.clientY / window.innerHeight - 0.5,
      };
    };
    const loop = () => {
      current.x += (target.x - current.x) * 0.06;
      current.y += (target.y - current.y) * 0.06;
      stage.style.transform = `perspective(1000px) rotateX(${(-current.y * 5).toFixed(2)}deg) rotateY(${(current.x * 6).toFixed(2)}deg)`;
      frame = requestAnimationFrame(loop);
    };

    window.addEventListener("pointermove", onMove);
    frame = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(frame);
    };
  }, [reduceMotion]);

  const bob = (delay: number) =>
    reduceMotion
      ? undefined
      : {
          y: [0, -14, 0],
          transition: { duration: 5, repeat: Infinity, ease: "easeInOut", delay },
        };

  return (
    <div className="relative min-h-screen overflow-hidden gradient-dream">
      <style>{`
        @keyframes nf-drift1 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(40px,30px) scale(1.08); } }
        @keyframes nf-drift2 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-50px,-30px) scale(1.1); } }
        @keyframes nf-drift3 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(30px,-40px) scale(1.06); } }
        @keyframes nf-spin { to { transform: rotate(360deg); } }
        @keyframes nf-twinkle { 0%,100% { opacity: .25; transform: scale(.85); } 50% { opacity: .9; transform: scale(1.1); } }
        .nf-orb { position: absolute; border-radius: 50%; filter: blur(60px); opacity: .5; will-change: transform; pointer-events: none; }
        .nf-ring {
          position: absolute; inset: 0; border-radius: 50%; opacity: .92;
          background: conic-gradient(from 0deg, hsl(var(--lavender)), hsl(var(--rose)), hsl(var(--peach-deep)), hsl(var(--mint)), hsl(var(--lavender)));
          -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 13px), #000 calc(100% - 12px));
                  mask: radial-gradient(farthest-side, transparent calc(100% - 13px), #000 calc(100% - 12px));
          animation: nf-spin 14s linear infinite;
        }
        .nf-ring-2 {
          inset: 12%; opacity: .5; animation-duration: 22s; animation-direction: reverse;
          -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 9px), #000 calc(100% - 8px));
                  mask: radial-gradient(farthest-side, transparent calc(100% - 9px), #000 calc(100% - 8px));
        }
        @media (prefers-reduced-motion: reduce) {
          .nf-orb, .nf-ring, .nf-star { animation: none !important; }
        }
      `}</style>

      {/* Orbes ambiantes */}
      <div aria-hidden className="absolute inset-0 z-0">
        <span
          className="nf-orb"
          style={{
            width: 460, height: 460, top: -120, left: -100,
            background: "radial-gradient(circle at 35% 35%, hsl(var(--lavender) / 0.9), transparent 70%)",
            animation: reduceMotion ? undefined : "nf-drift1 16s ease-in-out infinite",
          }}
        />
        <span
          className="nf-orb"
          style={{
            width: 520, height: 520, bottom: -160, right: -120,
            background: "radial-gradient(circle at 50% 50%, hsl(var(--peach) / 0.85), transparent 70%)",
            animation: reduceMotion ? undefined : "nf-drift2 20s ease-in-out infinite",
          }}
        />
        <span
          className="nf-orb"
          style={{
            width: 360, height: 360, top: "40%", left: "8%",
            background: "radial-gradient(circle at 50% 50%, hsl(var(--mint) / 0.7), transparent 70%)",
            animation: reduceMotion ? undefined : "nf-drift3 18s ease-in-out infinite",
          }}
        />
        <span
          className="nf-orb"
          style={{
            width: 300, height: 300, top: "12%", right: "14%",
            background: "radial-gradient(circle at 50% 50%, hsl(var(--rose) / 0.7), transparent 70%)",
            animation: reduceMotion ? undefined : "nf-drift1 22s ease-in-out infinite reverse",
          }}
        />
      </div>

      {/* Étoiles */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-[1]">
        {stars.map((s, i) => (
          <span
            key={i}
            className="nf-star absolute rounded-full"
            style={{
              top: s.top,
              left: s.left,
              width: s.size,
              height: s.size,
              background: s.color,
              boxShadow: `0 0 ${s.size * 4}px ${s.color}`,
              animation: reduceMotion
                ? undefined
                : `nf-twinkle ${s.duration}s ease-in-out ${s.delay}s infinite`,
              opacity: reduceMotion ? 0.5 : undefined,
            }}
          />
        ))}
      </div>

      {/* Marque */}
      <Link
        to="/"
        aria-label="DreamWeave, retour à l'accueil"
        className="absolute left-6 top-6 z-10 flex items-center gap-2 font-display text-lg font-bold"
      >
        <LogoMark className="h-6 w-auto shrink-0" />
        <span className="text-gradient">DreamWeave</span>
      </Link>

      {/* Contenu */}
      <main className="relative z-[2] flex min-h-screen flex-col items-center justify-center px-6 py-[5vw] text-center">
        <div ref={stageRef} className="will-change-transform" style={{ transition: "transform .25s ease-out" }}>
          <div
            className="flex items-center justify-center font-display font-bold leading-[0.82] tracking-tight"
            style={{ fontSize: "clamp(7rem, 26vw, 19rem)", gap: "clamp(0.5rem, 2vw, 1.4rem)" }}
          >
            <motion.span
              className="text-gradient inline-block"
              style={{ filter: "drop-shadow(0 18px 40px hsl(var(--lavender) / 0.28))" }}
              animate={bob(0)}
            >
              4
            </motion.span>

            {/* Portail */}
            <motion.span
              className="relative grid place-items-center"
              style={{ width: "clamp(7rem, 24vw, 17rem)", aspectRatio: "1" }}
              animate={bob(0.2)}
            >
              <span className="nf-ring" />
              <span className="nf-ring nf-ring-2" />
              <span
                className="absolute rounded-full"
                style={{
                  inset: "22%",
                  background:
                    "radial-gradient(circle at 38% 34%, hsl(var(--lavender-soft)), hsl(var(--lavender) / 0.35) 70%, hsl(var(--peach) / 0.25))",
                  boxShadow:
                    "inset 0 0 40px hsl(var(--lavender) / 0.4), 0 0 50px hsl(var(--glow) / 0.4)",
                }}
              />
              <motion.span
                className="relative z-[3] text-primary"
                style={{ filter: "drop-shadow(0 4px 10px hsl(var(--lavender) / 0.5))" }}
                animate={
                  reduceMotion
                    ? undefined
                    : {
                        y: [-6, 8, -6],
                        rotate: [-8, 8, -8],
                        transition: { duration: 4.5, repeat: Infinity, ease: "easeInOut" },
                      }
                }
              >
                <Star className="h-11 w-11 fill-current" />
              </motion.span>
            </motion.span>

            <motion.span
              className="text-gradient inline-block"
              style={{ filter: "drop-shadow(0 18px 40px hsl(var(--lavender) / 0.28))" }}
              animate={bob(0.4)}
            >
              4
            </motion.span>
          </div>

          {/* Carte message */}
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
            className="glass mx-auto mt-8 max-w-[560px] rounded-[1.6rem] p-7 sm:p-9"
          >
            <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-lavender-soft px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-primary">
              <Search className="h-3.5 w-3.5" />
              Erreur 404
            </span>
            <h1 className="font-display text-2xl font-bold leading-tight sm:text-3xl">
              Ce chapitre s'est égaré dans le rêve
            </h1>
            <p className="mx-auto mt-3 max-w-[42ch] text-base leading-relaxed text-muted-foreground">
              La page que vous cherchez a glissé entre deux cases de l'histoire. Elle n'existe
              plus, a été déplacée, ou n'a jamais été tissée.
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button asChild className="gradient-primary text-primary-foreground shadow-dream">
                <Link to="/">
                  <Home className="h-4 w-4" />
                  Retour à l'accueil
                </Link>
              </Button>
              <Button
                variant="outline"
                className="glass border-border hover:border-primary/60 hover:text-primary"
                onClick={() => navigate(-1)}
              >
                <ArrowLeft className="h-4 w-4" />
                Page précédente
              </Button>
            </div>

            <p className="mt-5 text-sm text-muted-foreground">
              Ou reprenez le fil depuis votre{" "}
              <Link to="/dashboard" className="font-semibold text-primary hover:underline">
                tableau de bord
              </Link>
              .
            </p>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default NotFound;
