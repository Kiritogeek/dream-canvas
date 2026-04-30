import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Check,
  X,
  Zap,
  Sparkles,
  Image,
  FolderOpen,
  Users,
  Eye,
  Crown,
  Loader2,
  Settings,
  FlaskConical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { TIER_CONFIG } from "@/types";
import { supabase } from "@/integrations/supabase/client";

interface FeatureRow {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  free: string | boolean;
  pro: string | boolean;
}

const features: FeatureRow[] = [
  {
    label: "Modèle d'IA",
    icon: Sparkles,
    free: "FLUX.1 Schnell (rapide)",
    pro: "FLUX.2 Pro (haute qualité)",
  },
  {
    label: "Générations / mois",
    icon: Image,
    free: `${TIER_CONFIG.free.maxGenerationsPerMonth}`,
    pro: `${TIER_CONFIG.pro.maxGenerationsPerMonth}`,
  },
  {
    label: "Projets & Assets",
    icon: FolderOpen,
    free: "Illimités",
    pro: "Illimités",
  },
  {
    label: "Images de référence",
    icon: Users,
    free: false,
    pro: "2 images",
  },
  {
    label: "Sheet System 4 angles",
    icon: Eye,
    free: true,
    pro: true,
  },
  {
    label: "Résolution",
    icon: Image,
    free: "1280×1024",
    pro: "1280×1024",
  },
];

function FeatureValue({ value }: { value: string | boolean }) {
  if (value === true) {
    return <Check className="h-5 w-5 text-emerald-500 mx-auto" />;
  }
  if (value === false) {
    return <X className="h-5 w-5 text-muted-foreground/40 mx-auto" />;
  }
  return (
    <span className="text-sm font-medium">{value}</span>
  );
}

export default function Plans() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { plan, usageInfo, goToCheckout, goToPortal, invalidate } = useUserPlan();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isTogglingPlan, setIsTogglingPlan] = useState(false);
  const isAdmin = !!import.meta.env.VITE_ADMIN_EMAIL && user?.email === import.meta.env.VITE_ADMIN_EMAIL;

  const handleAdminTogglePlan = async () => {
    setIsTogglingPlan(true);
    try {
      await supabase.auth.refreshSession();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Session introuvable");
      const newPlan = plan === "pro" ? "free" : "pro";
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-set-plan`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ plan: newPlan }),
        }
      );
      if (!res.ok) throw new Error("Erreur serveur");
      invalidate();
      toast({ title: `Plan basculé → ${newPlan.toUpperCase()}`, description: "Rafraîchis la page si l'UI ne se met pas à jour." });
    } catch (err) {
      toast({ title: "Erreur", description: err instanceof Error ? err.message : "Échec", variant: "destructive" });
    } finally {
      setIsTogglingPlan(false);
    }
  };

  // Toasts retour Stripe : ?success=true ou ?canceled=true
  useEffect(() => {
    if (searchParams.get("success") === "true") {
      toast({
        title: "Bienvenue dans le plan Pro !",
        description:
          "Votre abonnement est actif. Vous avez maintenant accès à toutes les fonctionnalités.",
      });
      invalidate();
      searchParams.delete("success");
      setSearchParams(searchParams, { replace: true });
    } else if (searchParams.get("canceled") === "true") {
      toast({
        title: "Paiement annulé",
        description: "Vous pouvez réessayer quand vous le souhaitez.",
        variant: "destructive",
      });
      searchParams.delete("canceled");
      setSearchParams(searchParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCheckout = async () => {
    try {
      setIsRedirecting(true);
      await goToCheckout();
    } catch (err) {
      setIsRedirecting(false);
      toast({
        title: "Erreur",
        description: err instanceof Error ? err.message : "Impossible de lancer le paiement.",
        variant: "destructive",
      });
    }
  };

  const handlePortal = async () => {
    try {
      setIsRedirecting(true);
      await goToPortal();
    } catch (err) {
      setIsRedirecting(false);
      toast({
        title: "Erreur",
        description: err instanceof Error ? err.message : "Impossible d'ouvrir le portail.",
        variant: "destructive",
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 sm:space-y-8 max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-2 sm:space-y-3"
        >
          <h1 className="text-2xl sm:text-3xl font-display font-bold">
            Choisissez votre plan
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground max-w-lg mx-auto px-2">
            Commencez gratuitement et passez au Pro quand vous êtes prêt à
            libérer tout le potentiel de DreamWeave.
          </p>
        </motion.div>

        {/* Bandeau admin — visible uniquement pour kiritogeek@gmail.com */}
        {isAdmin && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between gap-4 glass rounded-xl p-3 px-4 border border-violet-500/30 bg-violet-500/5"
          >
            <div className="flex items-center gap-2 text-sm text-violet-300">
              <FlaskConical className="h-4 w-4 shrink-0" />
              <span>Mode admin — plan actuel : <strong>{plan.toUpperCase()}</strong></span>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="border-violet-500/40 text-violet-300 hover:bg-violet-500/10 hover:text-violet-200"
              onClick={handleAdminTogglePlan}
              disabled={isTogglingPlan}
            >
              {isTogglingPlan ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                `Basculer → ${plan === "pro" ? "Free" : "Pro"}`
              )}
            </Button>
          </motion.div>
        )}

        {/* Bannière de redirection Stripe */}
        {isRedirecting && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-xl p-4 flex items-center justify-center gap-3 text-sm text-primary"
          >
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Redirection vers Stripe…</span>
          </motion.div>
        )}

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* Free Plan */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={`glass rounded-xl sm:rounded-2xl p-5 sm:p-6 space-y-4 sm:space-y-6 border-2 transition-colors ${
              plan === "free"
                ? "border-primary shadow-dream"
                : "border-transparent"
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-lg sm:text-xl font-display font-bold">Free</h2>
                {plan === "free" && (
                  <span className="ml-auto px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                    Plan actuel
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl sm:text-4xl font-display font-bold">0 €</span>
                <span className="text-muted-foreground text-sm">/ mois</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Idéal pour découvrir DreamWeave et expérimenter avec la
                génération IA.
              </p>
            </div>

            <ul className="space-y-3">
              {features.map((f) => (
                <li key={f.label} className="flex items-center gap-3 text-sm">
                  {f.free === false ? (
                    <X className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                  ) : (
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                  )}
                  <span className={f.free === false ? "text-muted-foreground/60" : ""}>
                    {f.label}
                    {typeof f.free === "string" && (
                      <span className="text-muted-foreground ml-1">
                        — {f.free}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>

            <Button variant="outline" className="w-full" disabled>
              {plan === "free" ? "Plan actuel" : "Plan de base"}
            </Button>
          </motion.div>

          {/* Pro Plan */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`relative glass rounded-xl sm:rounded-2xl p-5 sm:p-6 space-y-4 sm:space-y-6 border-2 transition-colors ${
              plan === "pro"
                ? "border-amber-500 shadow-dream"
                : "border-amber-500/30"
            }`}
          >
            {/* Badge recommandé */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg">
                <Crown className="h-3 w-3" />
                Recommandé
              </span>
            </div>

            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-500" />
                <h2 className="text-lg sm:text-xl font-display font-bold">Pro</h2>
                {plan === "pro" && (
                  <span className="ml-auto px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-semibold">
                    Plan actuel
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl sm:text-4xl font-display font-bold">14,99 €</span>
                <span className="text-muted-foreground text-sm">/ mois</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Pour les créateurs sérieux qui veulent des résultats de haute
                qualité avec des images de référence.
              </p>
            </div>

            <ul className="space-y-3">
              {features.map((f) => (
                <li key={f.label} className="flex items-center gap-3 text-sm">
                  {f.pro === false ? (
                    <X className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                  ) : (
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                  )}
                  <span>
                    {f.label}
                    {typeof f.pro === "string" && (
                      <span className="text-muted-foreground ml-1">
                        — {f.pro}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>

            {plan === "pro" ? (
              <Button
                variant="outline"
                className="w-full"
                onClick={handlePortal}
                disabled={isRedirecting}
              >
                {isRedirecting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Redirection…
                  </>
                ) : (
                  <>
                    <Settings className="h-4 w-4 mr-2" />
                    Gérer l'abonnement
                  </>
                )}
              </Button>
            ) : (
              <Button
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 shadow-lg"
                onClick={handleCheckout}
                disabled={isRedirecting}
              >
                {isRedirecting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Redirection…
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Passer au Pro
                  </>
                )}
              </Button>
            )}
          </motion.div>
        </div>

        {/* Tableau comparatif — masqué sur très petit mobile, visible en sm+ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass rounded-xl sm:rounded-2xl overflow-hidden"
        >
          <div className="p-4 sm:p-6 border-b border-border/50">
            <h2 className="text-base sm:text-lg font-display font-semibold">
              Comparaison détaillée
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px]">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left px-3 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-medium text-muted-foreground">
                    Fonctionnalité
                  </th>
                  <th className="text-center px-3 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-medium text-muted-foreground w-24 sm:w-36">
                    Free
                  </th>
                  <th className="text-center px-3 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-medium w-24 sm:w-36">
                    <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                      <Zap className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      Pro
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {features.map((f, i) => (
                  <tr
                    key={f.label}
                    className={
                      i % 2 === 0 ? "bg-muted/20" : ""
                    }
                  >
                    <td className="px-3 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <f.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
                        <span className="line-clamp-1">{f.label}</span>
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-2.5 sm:py-3 text-center">
                      <FeatureValue value={f.free} />
                    </td>
                    <td className="px-3 sm:px-6 py-2.5 sm:py-3 text-center">
                      <FeatureValue value={f.pro} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Usage actuel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass rounded-xl sm:rounded-2xl p-4 sm:p-6 space-y-3 sm:space-y-4"
        >
          <h2 className="text-base sm:text-lg font-display font-semibold">
            Votre utilisation ce mois-ci
          </h2>
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm text-muted-foreground">
              Générations d'images
            </span>
            <span className="text-xs sm:text-sm font-medium">
              {usageInfo.count} / {usageInfo.limit}
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2 sm:h-2.5">
            <div
              className={`h-2 sm:h-2.5 rounded-full transition-all duration-500 ${
                usageInfo.count / usageInfo.limit >= 0.9
                  ? "bg-destructive"
                  : usageInfo.count / usageInfo.limit >= 0.7
                    ? "bg-amber-500"
                    : "bg-primary"
              }`}
              style={{
                width: `${Math.min(100, Math.round((usageInfo.count / usageInfo.limit) * 100))}%`,
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Le compteur est réinitialisé le 1er de chaque mois.
          </p>
        </motion.div>

        {/* Note */}
        <p className="text-xs text-center text-muted-foreground pb-6 sm:pb-8">
          Paiement sécurisé par Stripe. Vous pouvez annuler à tout moment depuis
          la page « Gérer l'abonnement ».
        </p>
      </div>
    </DashboardLayout>
  );
}
