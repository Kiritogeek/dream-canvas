import { Link } from "react-router-dom";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { Sparkles, Wand2, Palette, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";

const features = [
  {
    icon: Wand2,
    title: "Génération IA",
    desc: "Décrivez vos personnages, décors et objets — l'IA crée vos assets en un instant.",
  },
  {
    icon: Palette,
    title: "Style cohérent",
    desc: "Définissez un style visuel unique via texte et images de référence, appliqué à toutes vos créations.",
  },
  {
    icon: Users,
    title: "Vues multiples",
    desc: "Générez vos personnages sous tous les angles : face, profil gauche, profil droit et dos.",
  },
  {
    icon: Sparkles,
    title: "Bibliothèque d'assets",
    desc: "Organisez vos personnages, décors et objets dans une bibliothèque réutilisable par projet.",
  },
];

export default function Landing() {
  const showcaseBase = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/dreamweave/landing-showcase`;
  const cards = useMemo(
    () => Array.from({ length: 12 }, (_, idx) => `${showcaseBase}/card-${idx + 1}.png`),
    [showcaseBase]
  );

  const bgCards = useMemo(() => {
    const randomFactor = () => 0.5 + Math.random(); // marge de 50%
    const clamp = (value: number, min: number, max: number) =>
      Math.max(min, Math.min(max, value));
    const overlaps = (
      a: { top: number; left: number; width: number; height: number },
      b: { top: number; left: number; width: number; height: number }
    ) =>
      a.left < b.left + b.width &&
      a.left + a.width > b.left &&
      a.top < b.top + b.height &&
      a.top + a.height > b.top;

    const baseCards = [
      { cardIndex: 0, side: "left", top: 10, distance: 3, rotate: -3 },
      { cardIndex: 1, side: "left", top: 26, distance: 4, rotate: 2 },
      { cardIndex: 2, side: "left", top: 42, distance: 3, rotate: -2 },
      { cardIndex: 3, side: "left", top: 58, distance: 4, rotate: 3 },
      { cardIndex: 6, side: "left", top: 74, distance: 3, rotate: -3 },
      { cardIndex: 7, side: "left", top: 86, distance: 4, rotate: 2 },
      { cardIndex: 4, side: "right", top: 10, distance: 3, rotate: 3 },
      { cardIndex: 5, side: "right", top: 26, distance: 4, rotate: -2 },
      { cardIndex: 8, side: "right", top: 42, distance: 3, rotate: 2 },
      { cardIndex: 9, side: "right", top: 58, distance: 4, rotate: -3 },
      { cardIndex: 10, side: "right", top: 74, distance: 3, rotate: 3 },
      { cardIndex: 11, side: "right", top: 86, distance: 4, rotate: -2 },
    ] as const;

    const placedRects: Array<{ top: number; left: number; width: number; height: number }> = [];
    const viewportWidthPx =
      typeof window !== "undefined" ? window.innerWidth : 1440;
    const viewportHeightPx =
      typeof window !== "undefined" ? window.innerHeight : 900;
    const safeMarginPx = 56;

    return baseCards.map((base, idx) => {
      let widthPx = clamp(264 * randomFactor(), 162, 396);
      let heightPx = clamp(162 * randomFactor(), 108, 243);
      const duration = 20 * randomFactor();
      const delay = Math.random() * 9;

      const minTopPct = 10;
      const maxTopPct = Math.max(
        minTopPct,
        ((viewportHeightPx - heightPx - safeMarginPx) / viewportHeightPx) * 100
      );
      let chosenTopPct = clamp(base.top * randomFactor(), minTopPct, maxTopPct);
      let chosenDistancePct = clamp(base.distance * randomFactor(), 1.5, 26);
      let found = false;

      for (let sizeAttempt = 0; sizeAttempt < 4 && !found; sizeAttempt++) {
        const scaledWidth = widthPx * (1 - sizeAttempt * 0.1);
        const scaledHeight = heightPx * (1 - sizeAttempt * 0.1);

        // Phase 1: tentatives aléatoires
        for (let attempt = 0; attempt < 260; attempt++) {
          const topPct = minTopPct + Math.random() * Math.max(0, maxTopPct - minTopPct);
          const distancePct = 1.5 + Math.random() * 24.5;

          const topPx = (topPct / 100) * viewportHeightPx;
          const leftPx =
            base.side === "left"
              ? (distancePct / 100) * viewportWidthPx
              : viewportWidthPx - (distancePct / 100) * viewportWidthPx - scaledWidth;

          const candidate = {
            top: topPx,
            left: leftPx,
            width: scaledWidth + safeMarginPx,
            height: scaledHeight + safeMarginPx,
          };

          const hasCollision = placedRects.some((rect) => overlaps(candidate, rect));
          if (!hasCollision) {
            chosenTopPct = topPct;
            chosenDistancePct = distancePct;
            widthPx = scaledWidth;
            heightPx = scaledHeight;
            placedRects.push(candidate);
            found = true;
            break;
          }
        }

        // Phase 2: scan déterministe (garantit qu'on n'ajoute jamais une position en collision)
        if (!found) {
          for (let topPct = minTopPct; topPct <= maxTopPct && !found; topPct += 2.2) {
            for (let distancePct = 1.5; distancePct <= 26 && !found; distancePct += 1.2) {
              const topPx = (topPct / 100) * viewportHeightPx;
              const leftPx =
                base.side === "left"
                  ? (distancePct / 100) * viewportWidthPx
                  : viewportWidthPx - (distancePct / 100) * viewportWidthPx - scaledWidth;

              const candidate = {
                top: topPx,
                left: leftPx,
                width: scaledWidth + safeMarginPx,
                height: scaledHeight + safeMarginPx,
              };

              const hasCollision = placedRects.some((rect) => overlaps(candidate, rect));
              if (!hasCollision) {
                chosenTopPct = topPct;
                chosenDistancePct = distancePct;
                widthPx = scaledWidth;
                heightPx = scaledHeight;
                placedRects.push(candidate);
                found = true;
              }
            }
          }
        }
      }

      if (!found) {
        // Dernier filet de sécurité: mini-carte + scan strict pour éviter tout chevauchement.
        widthPx = 120;
        heightPx = 72;
        for (let topPct = minTopPct; topPct <= maxTopPct && !found; topPct += 1.5) {
          for (let distancePct = 1.5; distancePct <= 26 && !found; distancePct += 1) {
            const topPx = (topPct / 100) * viewportHeightPx;
            const leftPx =
              base.side === "left"
                ? (distancePct / 100) * viewportWidthPx
                : viewportWidthPx - (distancePct / 100) * viewportWidthPx - widthPx;
            const candidate = {
              top: topPx,
              left: leftPx,
              width: widthPx + safeMarginPx,
              height: heightPx + safeMarginPx,
            };
            const hasCollision = placedRects.some((rect) => overlaps(candidate, rect));
            if (!hasCollision) {
              chosenTopPct = topPct;
              chosenDistancePct = distancePct;
              placedRects.push(candidate);
              found = true;
            }
          }
        }
      }

      return {
        src: cards[base.cardIndex],
        side: base.side,
        top: clamp(chosenTopPct, minTopPct, maxTopPct),
        distance: chosenDistancePct,
        rotate: 0,
        widthPx,
        heightPx,
        duration,
        delay,
      };
    });
  }, [cards]);

  return (
    <div className="min-h-screen gradient-dream">
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        {bgCards.map((card, idx) => (
          <div
            key={`${card.src}-${idx}`}
            className="absolute hidden lg:block landing-bg-card-fade"
            style={{
              top: `${card.top}%`,
              [card.side]: `${card.distance}%`,
              transform: `rotate(${card.rotate}deg)`,
              animationDelay: `${card.delay}s`,
              animationDuration: `${card.duration}s`,
            }}
          >
            <div
              className="rounded-xl overflow-hidden shadow-dream bg-background/20"
              style={{ width: `${card.widthPx}px`, height: `${card.heightPx}px` }}
            >
              <ImageWithFallback
                src={card.src}
                alt="Exemple webtoon généré"
                className="w-full h-full object-cover"
                fallbackClassName="w-full h-full bg-muted"
              />
            </div>
          </div>
        ))}
      </div>
      <div className="fixed inset-0 pointer-events-none bg-gradient-to-b from-background/86 via-background/70 to-background/90" />
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 glass">
        <div className="container px-4 sm:px-6 lg:px-8 flex h-14 sm:h-16 items-center justify-between">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <ThemeToggle />
            <Link to="/" className="flex items-center gap-1.5 sm:gap-2">
              <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              <span className="font-display text-lg sm:text-xl font-bold text-gradient">
                DreamWeave
              </span>
            </Link>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Button variant="ghost" asChild size="sm" className="text-xs sm:text-sm">
              <Link to="/auth">Connexion</Link>
            </Button>
            <Button
              asChild
              size="sm"
              className="gradient-primary text-primary-foreground shadow-dream text-xs sm:text-sm"
            >
              <Link to="/auth?tab=signup">
                <span className="hidden sm:inline">Commencer gratuitement</span>
                <span className="sm:hidden">S'inscrire</span>
              </Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-24 sm:pt-32 pb-12 sm:pb-20 overflow-hidden">
        <div className="container px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-5xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="space-y-4 sm:space-y-6"
            >
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-medium text-primary">
                <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Créez sans savoir dessiner
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-display font-bold leading-tight">
                Tissez vos{" "}
                <span className="text-gradient">rêves</span> en
                webtoons
              </h1>
              <p className="text-base sm:text-lg text-muted-foreground max-w-lg mx-auto px-2">
                DreamWeave transforme vos idées en magnifiques webtoons
                verticaux grâce à l'intelligence artificielle. Aucun talent
                artistique requis.
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Button
                  size="lg"
                  asChild
                  className="gradient-primary text-primary-foreground shadow-dream text-sm sm:text-base px-6 sm:px-8"
                >
                  <Link to="/auth?tab=signup">
                    <Wand2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                    Créer mon webtoon
                  </Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative z-20 py-12 sm:py-20 bg-background/94 backdrop-blur-[1px]">
        <div className="container px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10 sm:mb-16"
          >
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold mb-3 sm:mb-4">
              Tout ce qu'il faut pour créer
            </h2>
            <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto px-2">
              Des outils simples et puissants pour donner vie à vos histoires
            </p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass rounded-2xl p-5 sm:p-6 hover:shadow-dream transition-shadow duration-300"
                >
                <div className="mb-3 sm:mb-4 inline-flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-primary/10">
                  <f.icon className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
                <h3 className="font-display font-semibold text-base sm:text-lg mb-1.5 sm:mb-2">
                  {f.title}
                </h3>
                <p className="text-muted-foreground text-sm">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-20 border-t border-border/50 py-6 sm:py-8 bg-background/94">
        <div className="container px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="font-display font-bold text-gradient">
              DreamWeave
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            © 2026 DreamWeave. Tous droits réservés.
          </p>
        </div>
      </footer>
    </div>
  );
}
