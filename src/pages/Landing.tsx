import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, Wand2, BookOpen, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroBg from "@/assets/hero-bg.jpg";

const features = [
  {
    icon: Wand2,
    title: "Génération IA",
    desc: "Décrivez votre scène et laissez l'IA créer vos panels webtoon en un instant.",
  },
  {
    icon: Palette,
    title: "Style cohérent",
    desc: "Définissez un style visuel unique qui reste constant à travers toute votre histoire.",
  },
  {
    icon: BookOpen,
    title: "Lecture verticale",
    desc: "Prévisualisez vos chapitres en défilement vertical, comme un vrai webtoon.",
  },
  {
    icon: Sparkles,
    title: "Bulles & dialogues",
    desc: "Ajoutez des bulles de dialogue personnalisables avec des polices variées.",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen gradient-dream">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 glass">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <span className="font-display text-xl font-bold text-gradient">DreamWeave</span>
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link to="/auth">Connexion</Link>
            </Button>
            <Button asChild className="gradient-primary text-primary-foreground shadow-dream">
              <Link to="/auth?tab=signup">Commencer gratuitement</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="container relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="space-y-6"
            >
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
                <Sparkles className="h-4 w-4" />
                Créez sans savoir dessiner
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold leading-tight">
                Tissez vos{" "}
                <span className="text-gradient">rêves</span>{" "}
                en webtoons
              </h1>
              <p className="text-lg text-muted-foreground max-w-lg">
                DreamWeave transforme vos idées en magnifiques webtoons verticaux grâce à l'intelligence artificielle. 
                Aucun talent artistique requis.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button size="lg" asChild className="gradient-primary text-primary-foreground shadow-dream text-base px-8">
                  <Link to="/auth?tab=signup">
                    <Wand2 className="mr-2 h-5 w-5" />
                    Créer mon webtoon
                  </Link>
                </Button>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative"
            >
              <div className="rounded-2xl overflow-hidden shadow-dream border border-border/50">
                <img src={heroBg} alt="DreamWeave webtoon panels" className="w-full h-auto" />
              </div>
              <div className="absolute -bottom-4 -right-4 h-24 w-24 rounded-full bg-secondary animate-float opacity-60" />
              <div className="absolute -top-4 -left-4 h-16 w-16 rounded-full bg-accent animate-float opacity-60" style={{ animationDelay: "1s" }} />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              Tout ce qu'il faut pour créer
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Des outils simples et puissants pour donner vie à vos histoires
            </p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass rounded-2xl p-6 hover:shadow-dream transition-shadow duration-300"
              >
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <f.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-display font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-muted-foreground text-sm">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="container flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="font-display font-bold text-gradient">DreamWeave</span>
          </div>
          <p className="text-sm text-muted-foreground">© 2026 DreamWeave. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
}
