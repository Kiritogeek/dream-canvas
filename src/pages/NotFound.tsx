import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  return (
    <div className="flex min-h-screen items-center justify-center gradient-dream p-4">
      <div className="text-center space-y-4">
        <Sparkles className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-primary opacity-50" />
        <h1 className="text-5xl sm:text-6xl font-display font-bold text-gradient">404</h1>
        <p className="text-base sm:text-lg text-muted-foreground">
          Oups ! Cette page n'existe pas.
        </p>
        <Button asChild className="gradient-primary text-primary-foreground shadow-dream">
          <Link to="/">Retour à l'accueil</Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
