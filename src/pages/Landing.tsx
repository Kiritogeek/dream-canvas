import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, Wand2, Palette, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import heroBg from "@/assets/hero-bg.jpg";

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
  return (
    <div className="min-h-screen">
      {/* Hero background avec image */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: `url(${heroBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center top",
        }}
        aria-hidden="true"
      />
      {/* Overlay light */}
      <div className="fixed inset-0 pointer-events-none bg-gradient-to-b from-background/30 via-background/50 to-background/85 dark:from-background/60 dark:via-background/75 dark:to-background/95" />

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
              <div className="inline-flex items-center gap-2 rounded-full gradient-primary text-primary-foreground px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-medium shadow-dream">
                <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Créez sans savoir dessiner
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-display font-bold leading-tight text-foreground drop-shadow-sm">
                Tissez vos{" "}
                <span className="text-gradient drop-shadow-sm">rêves</span> en
                webtoons
              </h1>
              <p className="text-base sm:text-lg text-foreground/80 max-w-lg mx-auto px-2 drop-shadow-sm">
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
                <Button
                  variant="ghost"
                  size="lg"
                  asChild
                  className="text-sm sm:text-base px-6 sm:px-8 backdrop-blur-sm bg-background/30 hover:bg-background/50"
                >
                  <Link to="/auth">
                    Voir un exemple →
                  </Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative z-20 py-12 sm:py-20 bg-gradient-to-b from-[hsl(275_30%_92%/0.6)] to-background/90 dark:from-background/80 dark:to-background/95 backdrop-blur-[1px]">
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
                className="glass rounded-2xl p-5 sm:p-6 hover:shadow-dream hover:border-primary/40 transition-all duration-300"
              >
                <div className="mb-3 sm:mb-4 inline-flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-primary/20">
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
