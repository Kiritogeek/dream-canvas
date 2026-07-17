import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { LogoMark } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";

interface LegalLayoutProps {
  title: string;
  updatedAt: string;
  children: React.ReactNode;
}

export default function LegalLayout({ title, updatedAt, children }: LegalLayoutProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div
        aria-hidden
        className="gradient-dream pointer-events-none absolute -top-40 left-1/2 h-96 w-[80rem] -translate-x-1/2 opacity-25 blur-3xl"
      />

      <header className="relative z-10 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="container flex items-center justify-between px-4 py-4 sm:px-6">
          <Link to="/" className="group flex items-center gap-2">
            <LogoMark className="h-5 w-auto shrink-0 transition-transform group-hover:scale-110" />
            <span className="font-display font-bold text-gradient">DreamWeave</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Accueil
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container relative z-10 max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="glass rounded-2xl p-6 shadow-dream sm:p-10">
          <h1 className="font-display text-2xl font-bold text-gradient sm:text-3xl">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">Dernière mise à jour : {updatedAt}</p>
          <div className="mt-8 space-y-6 text-[0.95rem] leading-relaxed text-muted-foreground [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_h2]:mb-3 [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-foreground [&_p]:mb-3 [&_strong]:font-semibold [&_strong]:text-foreground [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
            {children}
          </div>
        </div>

        <footer className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
          <Link to="/cgu" className="transition-colors hover:text-foreground">
            Conditions d'utilisation
          </Link>
          <Link to="/confidentialite" className="transition-colors hover:text-foreground">
            Confidentialité
          </Link>
          <Link to="/" className="transition-colors hover:text-foreground">
            Accueil
          </Link>
          <span>© 2026 DreamWeave</span>
        </footer>
      </main>
    </div>
  );
}
