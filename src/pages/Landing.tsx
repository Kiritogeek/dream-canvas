import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Sparkles, Wand2, Palette, BookOpen, Layers,
  Image as ImageIcon, Check, ArrowRight, Zap, Brain,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ArianeOrbitIcon, ArianeBubble } from "@/components/ariane";
import { ARIANE_DISPLAY_NAME } from "@/constants/ariane";
import { TIER_CONFIG, planDisplayName, type UserPlan } from "@/types";

const steps = [
  {
    icon: Palette,
    title: "Définissez votre univers",
    desc: "Choisissez un style visuel (manga, webtoon coréen…) et générez vos premiers assets cohérents en décrivant personnages et décors.",
  },
  {
    icon: BookOpen,
    title: "Écrivez votre scénario",
    desc: "Rédigez en prose libre. L'IA vous aide à structurer, résumer et découper vos chapitres en cases numérotées.",
  },
  {
    icon: Layers,
    title: "Composez vos cases",
    desc: "Assemblez blocs image, couleurs et bulles de dialogue dans l'éditeur visuel. Exportez en PNG.",
  },
];

const features = [
  {
    icon: Wand2,
    title: "Génération IA (FLUX.2 Pro)",
    desc: "Le meilleur modèle d'image disponible, pour tous les plans. Décrivez, générez, itérez en quelques secondes.",
  },
  {
    icon: Palette,
    title: "Style cohérent par projet",
    desc: "Définissez un template une fois — chaque nouvel asset respecte automatiquement votre univers visuel.",
  },
  {
    icon: ImageIcon,
    title: "Sheet System 4 angles",
    desc: "Fiche personnage complète générée automatiquement : face, profil gauche, profil droit et dos.",
  },
  {
    icon: BookOpen,
    title: "Scénario IA",
    desc: "Résumés compacts et découpage intelligent de vos chapitres en cases numérotées, prêtes à composer.",
  },
  {
    icon: Layers,
    title: "Éditeur de cases",
    desc: "Blocs image, calques couleur, bulles de dialogue. Composition libre à la Figma, export PNG intégré.",
  },
  {
    icon: Sparkles,
    title: `${ARIANE_DISPLAY_NAME} — Mémoire narrative`,
    desc: "Votre IA de continuité surveille les incohérences de votre récit en arrière-plan après chaque sauvegarde.",
  },
];

const plans: Array<{ id: UserPlan; recommended: boolean; highlights: string[] }> = [
  {
    id: "libre",
    recommended: false,
    highlights: ["20 crédits / mois", "1 projet actif", "FLUX.2 Pro inclus"],
  },
  {
    id: "createur",
    recommended: true,
    highlights: ["150 crédits / mois", "Projets illimités", "Découpage IA + Export PNG"],
  },
  {
    id: "studio",
    recommended: false,
    highlights: ["500 crédits / mois", "Mémoire narrative longue", "Priorité de traitement"],
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen">
      {/* Hero background */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: `url(/hero-bg.jpg)`,
          backgroundSize: "cover",
          backgroundPosition: "center top",
        }}
        aria-hidden="true"
      />
      <div className="fixed inset-0 pointer-events-none bg-gradient-to-b from-background/30 via-background/50 to-background/85 dark:from-background/60 dark:via-background/75 dark:to-background/95" />

      {/* ── NAV ── */}
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

      {/* ── HERO ── */}
      <section className="relative pt-24 sm:pt-32 pb-16 sm:pb-24 overflow-hidden">
        <div className="container px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16">

              {/* Copy */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: "easeOut" }}
                className="flex-1 text-center lg:text-left space-y-5 sm:space-y-6"
              >
                <div className="inline-flex items-center gap-2 rounded-full gradient-primary text-primary-foreground px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-medium shadow-dream">
                  <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  IA générative de webtoons
                </div>

                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-display font-bold leading-tight text-foreground drop-shadow-sm">
                  Tissez vos{" "}
                  <span className="text-gradient drop-shadow-sm">rêves</span>
                  <br className="hidden sm:block" />
                  {" "}en webtoons
                </h1>

                <p className="text-base sm:text-lg text-foreground/80 max-w-lg mx-auto lg:mx-0 drop-shadow-sm leading-relaxed">
                  DreamWeave transforme vos idées en webtoons verticaux grâce à l'IA.{" "}
                  <span className="text-foreground font-medium">{ARIANE_DISPLAY_NAME}</span>{" "}
                  veille sur la cohérence de votre récit. Aucun talent artistique requis.
                </p>

                <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
                  <Button
                    size="lg"
                    asChild
                    className="gradient-primary text-primary-foreground shadow-dream text-sm sm:text-base px-6 sm:px-8"
                  >
                    <Link to="/auth?tab=signup">
                      <Wand2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                      Créer gratuitement
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="lg"
                    asChild
                    className="text-sm sm:text-base px-6 sm:px-8 backdrop-blur-sm bg-background/30 hover:bg-background/50"
                  >
                    <Link to="/auth">
                      Se connecter
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>

                {/* Bande de garanties */}
                <div className="flex flex-wrap gap-x-5 gap-y-2 justify-center lg:justify-start text-xs sm:text-sm text-foreground/65">
                  {["20 crédits offerts", "FLUX.2 Pro pour tous", "Sans carte bancaire"].map((s) => (
                    <span key={s} className="flex items-center gap-1.5">
                      <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                      {s}
                    </span>
                  ))}
                </div>
              </motion.div>

              {/* Ariane — présence hero */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.55, ease: "easeOut", delay: 0.2 }}
                className="flex-shrink-0 w-full max-w-sm lg:max-w-xs xl:max-w-sm"
              >
                <div className="flex flex-col items-center gap-5">
                  <ArianeOrbitIcon size={80} />
                  <ArianeBubble variant="onboarding" caption="Votre muse narrative">
                    <p className="font-semibold text-sm mb-1">
                      Bonjour, je suis {ARIANE_DISPLAY_NAME}&nbsp;✨
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      Je veille sur la cohérence de votre histoire, détecte les assets
                      manquants et vous guide à chaque étape de la création.
                    </p>
                  </ArianeBubble>
                </div>
              </motion.div>

            </div>
          </div>
        </div>
      </section>

      {/* ── COMMENT ÇA MARCHE ── */}
      <section className="relative z-20 py-16 sm:py-24 bg-gradient-to-b from-background/80 to-background/90 backdrop-blur-[1px]">
        <div className="container px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="text-center mb-12 sm:mb-16"
          >
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold mb-3">
              Comment ça marche
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base max-w-xl mx-auto">
              De l'idée à la planche publiée en trois étapes
            </p>
          </motion.div>

          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-0 relative">
              {/* Ligne pointillée desktop */}
              <div
                className="hidden sm:block absolute top-9 left-[calc(16.67%+20px)] right-[calc(16.67%+20px)] h-px border-t-2 border-dashed border-primary/20 z-0"
                aria-hidden
              />
              {steps.map((step, i) => (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35, ease: "easeOut", delay: i * 0.1 }}
                  className="relative z-10 flex flex-col items-center sm:items-start text-center sm:text-left sm:px-8"
                >
                  <div className="mb-4 relative">
                    <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full glass border border-primary/25">
                      <step.icon className="h-7 w-7 text-primary" />
                    </div>
                    <span className="absolute -top-1.5 -right-1.5 h-6 w-6 rounded-full gradient-primary text-primary-foreground text-xs font-bold flex items-center justify-center shadow-dream">
                      {i + 1}
                    </span>
                  </div>
                  <h3 className="font-display font-semibold text-base sm:text-lg mb-2">
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed max-w-[240px] sm:max-w-none">
                    {step.desc}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── ARIANE ── */}
      <section className="relative z-20 py-16 sm:py-24">
        <div className="container px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="gradient-dream rounded-2xl sm:rounded-3xl p-8 sm:p-12 max-w-4xl mx-auto"
          >
            <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">

              {/* Texte */}
              <div className="flex-1 text-center lg:text-left space-y-4">
                <div className="flex items-center justify-center lg:justify-start gap-3 mb-2">
                  <ArianeOrbitIcon size={44} />
                  <span className="text-xs font-semibold uppercase tracking-widest bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent">
                    Fil d'Ariane
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-display font-bold">
                  Rencontrez{" "}
                  <span className="text-gradient">{ARIANE_DISPLAY_NAME}</span>,
                  <br />votre muse narrative
                </h2>
                <p className="text-foreground/75 text-sm sm:text-base leading-relaxed max-w-sm mx-auto lg:mx-0">
                  {ARIANE_DISPLAY_NAME} analyse votre histoire en arrière-plan après chaque
                  sauvegarde. Elle repère les incohérences, signale les personnages manquants
                  et génère des résumés compacts pour nourrir vos prochaines générations IA.
                </p>
                <div className="flex flex-wrap gap-2 justify-center lg:justify-start">
                  {["Continuité narrative", "Assets manquants", "Résumés IA"].map((chip) => (
                    <span
                      key={chip}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full glass border border-primary/25 text-xs font-medium"
                    >
                      <Check className="h-3 w-3 text-primary shrink-0" />
                      {chip}
                    </span>
                  ))}
                </div>
              </div>

              {/* Bubble exemple */}
              <div className="flex-shrink-0 w-full max-w-xs sm:max-w-sm">
                <ArianeBubble variant="continuity" caption="Fil d'Ariane — alerte continuité">
                  <p className="font-semibold text-sm mb-1.5">
                    Incohérence détectée — Chapitre 5
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Elena est décrite avec les{" "}
                    <span className="text-foreground font-medium">cheveux bleus</span> au
                    chapitre&nbsp;3, mais les{" "}
                    <span className="text-foreground font-medium">cheveux noirs</span> au
                    chapitre&nbsp;5. Souhaitez-vous harmoniser&nbsp;?
                  </p>
                </ArianeBubble>
              </div>

            </div>
          </motion.div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="relative z-20 py-16 sm:py-24 bg-gradient-to-b from-background/80 to-background/90 backdrop-blur-[1px]">
        <div className="container px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="text-center mb-12 sm:mb-16"
          >
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold mb-3">
              Tout ce qu'il faut pour créer
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base max-w-xl mx-auto">
              Des outils simples et puissants pour donner vie à vos histoires
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-5xl mx-auto">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, ease: "easeOut", delay: i * 0.07 }}
                className="glass rounded-2xl p-5 sm:p-6 hover:shadow-dream hover:border-primary/40 transition-shadow transition-colors duration-300"
              >
                <div className="mb-3 sm:mb-4 inline-flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-primary/15">
                  <f.icon className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
                <h3 className="font-display font-semibold text-base sm:text-lg mb-1.5 sm:mb-2">
                  {f.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PLANS APERÇU ── */}
      <section className="relative z-20 py-16 sm:py-24">
        <div className="container px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="text-center mb-12 sm:mb-16"
          >
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold mb-3">
              Un plan pour chaque créateur
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base max-w-xl mx-auto">
              Commencez gratuitement. Passez à la vitesse supérieure quand vous êtes prêt.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 max-w-3xl mx-auto">
            {plans.map((p, i) => {
              const cfg = TIER_CONFIG[p.id];
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35, ease: "easeOut", delay: i * 0.1 }}
                  className={`relative glass rounded-2xl p-5 sm:p-6 flex flex-col gap-3 border-2 ${
                    p.recommended
                      ? "border-amber-500/50"
                      : p.id === "studio"
                      ? "border-violet-500/25"
                      : "border-transparent"
                  }`}
                >
                  {p.recommended && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-semibold gradient-primary text-primary-foreground shadow-dream">
                        Recommandé
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 pt-1">
                    {p.id === "studio" ? (
                      <Brain className="h-4 w-4 text-violet-500 shrink-0" />
                    ) : p.id === "createur" ? (
                      <Zap className="h-4 w-4 text-amber-500 shrink-0" />
                    ) : (
                      <Sparkles className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <span className="font-display font-bold text-sm sm:text-base">
                      {planDisplayName(p.id)}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-display font-bold">
                      {cfg.price === 0 ? "Gratuit" : `${cfg.price} €`}
                    </span>
                    {cfg.price > 0 && (
                      <span className="text-muted-foreground text-xs">/ mois</span>
                    )}
                  </div>
                  <ul className="space-y-1.5 flex-1">
                    {p.highlights.map((h) => (
                      <li
                        key={h}
                        className="flex items-start gap-2 text-xs sm:text-sm text-muted-foreground"
                      >
                        <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        {h}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              );
            })}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.35, ease: "easeOut", delay: 0.35 }}
            className="text-center mt-8"
          >
            <Button variant="outline" asChild className="gap-2">
              <Link to="/auth?tab=signup">
                Commencer — c'est gratuit
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="relative z-20 py-16 sm:py-24">
        <div className="container px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="gradient-dream rounded-2xl sm:rounded-3xl p-10 sm:p-16 text-center max-w-2xl mx-auto space-y-5"
          >
            <ArianeOrbitIcon size={56} className="mx-auto" />
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold">
              Prêt à tisser votre{" "}
              <span className="text-gradient">première histoire</span>&nbsp;?
            </h2>
            <p className="text-foreground/70 text-sm sm:text-base">
              Gratuit, sans carte bancaire · 20 crédits FLUX.2 Pro offerts
            </p>
            <Button
              size="lg"
              asChild
              className="gradient-primary text-primary-foreground shadow-dream text-sm sm:text-base px-8 sm:px-10"
            >
              <Link to="/auth?tab=signup">
                <Wand2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                Commencer maintenant
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="relative z-20 border-t border-border/50 py-6 sm:py-8 bg-background/94">
        <div className="container px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="font-display font-bold text-gradient">DreamWeave</span>
          </div>
          <div className="flex items-center gap-5 text-xs sm:text-sm text-muted-foreground">
            <Link to="/auth" className="hover:text-foreground transition-colors">
              Connexion
            </Link>
            <Link to="/auth?tab=signup" className="hover:text-foreground transition-colors">
              S'inscrire
            </Link>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            © 2026 DreamWeave. Tous droits réservés.
          </p>
        </div>
      </footer>
    </div>
  );
}
