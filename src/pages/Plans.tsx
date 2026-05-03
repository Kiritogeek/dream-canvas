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
  Scissors,
  Download,
  Brain,
  Crown,
  Loader2,
  Settings,
  FlaskConical,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { TIER_CONFIG, planDisplayName, type UserPlan } from "@/types";
import { supabase } from "@/integrations/supabase/client";

interface FeatureRow {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  libre: string | boolean;
  createur: string | boolean;
  studio: string | boolean;
}

const features: FeatureRow[] = [
  {
    label: "Crédits / mois",
    icon: Image,
    libre: `${TIER_CONFIG.libre.maxGenerationsPerMonth}`,
    createur: `${TIER_CONFIG.createur.maxGenerationsPerMonth}`,
    studio: `${TIER_CONFIG.studio.maxGenerationsPerMonth}`,
  },
  {
    label: "Projets actifs",
    icon: FolderOpen,
    libre: "1 projet",
    createur: "Illimités",
    studio: "Illimités",
  },
  {
    label: "Génération assets (FLUX.2 Pro)",
    icon: Sparkles,
    libre: true,
    createur: true,
    studio: true,
  },
  {
    label: "Sheet System 4 angles",
    icon: Image,
    libre: true,
    createur: true,
    studio: true,
  },
  {
    label: "Éditeur de cases",
    icon: Image,
    libre: true,
    createur: true,
    studio: true,
  },
  {
    label: "Scénario libre + résumés IA",
    icon: Brain,
    libre: true,
    createur: true,
    studio: true,
  },
  {
    label: "Découpage Chapitre → Cases",
    icon: Scissors,
    libre: false,
    createur: true,
    studio: true,
  },
  {
    label: "Export chapitre complet PNG",
    icon: Download,
    libre: false,
    createur: true,
    studio: true,
  },
  {
    label: "Fil d'Ariane",
    icon: Star,
    libre: "3 alertes max",
    createur: "Complet",
    studio: "Complet",
  },
  {
    label: "Mémoire narrative longue",
    icon: Brain,
    libre: false,
    createur: false,
    studio: true,
  },
  {
    label: "Priorité traitement FAL.ai",
    icon: Zap,
    libre: false,
    createur: false,
    studio: true,
  },
];

function FeatureValue({ value }: { value: string | boolean }) {
  if (value === true) return <Check className="h-5 w-5 text-emerald-500 mx-auto" />;
  if (value === false) return <X className="h-5 w-5 text-muted-foreground/40 mx-auto" />;
  return <span className="text-sm font-medium">{value}</span>;
}

const PLAN_ORDER: UserPlan[] = ["libre", "createur", "studio"];

export default function Plans() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { plan, usageInfo, nextResetDate, goToCheckout, goToPortal, invalidate } = useUserPlan();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isTogglingPlan, setIsTogglingPlan] = useState(false);
  const isAdmin =
    !!import.meta.env.VITE_ADMIN_EMAIL &&
    user?.email === import.meta.env.VITE_ADMIN_EMAIL;

  const nextAdminPlan: UserPlan =
    PLAN_ORDER[(PLAN_ORDER.indexOf(plan) + 1) % PLAN_ORDER.length];

  const handleAdminTogglePlan = async () => {
    setIsTogglingPlan(true);
    try {
      await supabase.auth.refreshSession();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Session introuvable");
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-set-plan`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ plan: nextAdminPlan }),
        }
      );
      if (!res.ok) throw new Error("Erreur serveur");
      invalidate();
      toast({
        title: `Plan basculé → ${planDisplayName(nextAdminPlan)}`,
        description: "Rafraîchis la page si l'UI ne se met pas à jour.",
      });
    } catch (err) {
      toast({
        title: "Erreur",
        description: err instanceof Error ? err.message : "Échec",
        variant: "destructive",
      });
    } finally {
      setIsTogglingPlan(false);
    }
  };

  useEffect(() => {
    if (searchParams.get("success") === "true") {
      toast({
        title: `Bienvenue dans le plan ${planDisplayName(plan)} !`,
        description: "Votre abonnement est actif.",
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
        description:
          err instanceof Error ? err.message : "Impossible de lancer le paiement.",
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
        description:
          err instanceof Error ? err.message : "Impossible d'ouvrir le portail.",
        variant: "destructive",
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 sm:space-y-8 max-w-5xl mx-auto">
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
            Même modèle FLUX.2 Pro pour tous — seule la quantité et les
            fonctionnalités avancées changent.
          </p>
        </motion.div>

        {/* Bandeau admin */}
        {isAdmin && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between gap-4 glass rounded-xl p-3 px-4 border border-violet-500/30 bg-violet-500/5"
          >
            <div className="flex items-center gap-2 text-sm text-violet-300">
              <FlaskConical className="h-4 w-4 shrink-0" />
              <span>
                Mode admin — plan actuel :{" "}
                <strong>{planDisplayName(plan)}</strong>
              </span>
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
                `Basculer → ${planDisplayName(nextAdminPlan)}`
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

        {/* 3 Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {/* Libre */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={`glass rounded-xl sm:rounded-2xl p-5 sm:p-6 flex flex-col gap-4 sm:gap-5 border-2 transition-all duration-300 ${
              plan === "libre" ? "border-primary" : "border-transparent"
            }`}
            style={plan === "libre" ? ({
              "--glass-shadow": "0 0 0 1px hsl(var(--primary)/0.25), 0 0 32px hsl(var(--primary)/0.35)",
            } as React.CSSProperties) : undefined}
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-lg font-display font-bold">
                  {TIER_CONFIG.libre.label}
                </h2>
                {plan === "libre" && (
                  <span className="ml-auto px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                    Plan actuel
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-display font-bold">0 €</span>
                <span className="text-muted-foreground text-sm">/ mois</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Découvrez DreamWeave et créez vos premiers assets avec l'IA.
              </p>
            </div>
            <ul className="space-y-2.5">
              {[
                "20 crédits / mois",
                "1 projet actif",
                "FLUX.2 Pro pour tous",
                "Sheet System 4 angles",
                "Éditeur de cases + export PNG",
                "Scénario libre + résumés IA",
                "Fil d'Ariane (3 alertes)",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-sm">
                  <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <Button variant="outline" className="w-full mt-auto" disabled>
              {plan === "libre" ? "Plan actuel" : "Plan de base"}
            </Button>
          </motion.div>

          {/* Créateur — Recommandé */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`relative glass rounded-xl sm:rounded-2xl p-5 sm:p-6 flex flex-col gap-4 sm:gap-5 border-2 transition-all duration-300 ${
              plan === "createur" ? "border-amber-500" : "border-amber-500/30"
            }`}
            style={plan === "createur" ? ({
              "--glass-shadow": "0 0 0 1px rgba(245,158,11,0.25), 0 0 36px rgba(245,158,11,0.45)",
            } as React.CSSProperties) : undefined}
          >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg">
                <Crown className="h-3 w-3" />
                Recommandé
              </span>
            </div>
            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-500" />
                <h2 className="text-lg font-display font-bold">
                  {TIER_CONFIG.createur.label}
                </h2>
                {plan === "createur" && (
                  <span className="ml-auto px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-semibold">
                    Plan actuel
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-display font-bold">7,99 €</span>
                <span className="text-muted-foreground text-sm">/ mois</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Pour les créateurs actifs prêts à donner vie à toute leur
                histoire.
              </p>
            </div>
            <ul className="space-y-2.5">
              {[
                "150 crédits / mois",
                "Projets illimités",
                "Tout le plan Libre",
                "Découpage Chapitre → Cases (IA)",
                "Export chapitre complet PNG",
                "Fil d'Ariane complet",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-sm">
                  <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            {plan === "createur" ? (
              <Button
                variant="outline"
                className="w-full mt-auto"
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
                className="w-full mt-auto bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 shadow-lg"
                onClick={handleCheckout}
                disabled={isRedirecting || plan === "studio"}
              >
                {isRedirecting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Redirection…
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    {plan === "studio" ? "Plan inférieur" : `Passer au plan ${TIER_CONFIG.createur.label}`}
                  </>
                )}
              </Button>
            )}
          </motion.div>

          {/* Studio */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className={`relative glass rounded-xl sm:rounded-2xl p-5 sm:p-6 flex flex-col gap-4 sm:gap-5 border-2 transition-all duration-300 ${
              plan === "studio" ? "border-violet-500" : "border-violet-500/20"
            }`}
            style={plan === "studio" ? ({
              "--glass-shadow": "0 0 0 1px rgba(139,92,246,0.3), 0 0 36px rgba(139,92,246,0.5)",
            } as React.CSSProperties) : undefined}
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-violet-500" />
                <h2 className="text-lg font-display font-bold">
                  {TIER_CONFIG.studio.label}
                </h2>
                {plan === "studio" && (
                  <span className="ml-auto px-2.5 py-0.5 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 text-xs font-semibold">
                    Plan actuel
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-display font-bold">19,99 €</span>
                <span className="text-muted-foreground text-sm">/ mois</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Pour les projets ambitieux avec mémoire narrative et traitement
                prioritaire.
              </p>
            </div>
            <ul className="space-y-2.5">
              {[
                "500 crédits / mois",
                "Projets illimités",
                "Tout le plan Créateur",
                "Mémoire narrative longue",
                "Priorité traitement FAL.ai",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-sm">
                  <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            {plan === "studio" ? (
              <Button
                variant="outline"
                className="w-full mt-auto"
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
                className="w-full mt-auto bg-gradient-to-r from-violet-500 to-purple-500 text-white hover:from-violet-600 hover:to-purple-600 shadow-lg"
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
                    {`Passer au plan ${TIER_CONFIG.studio.label}`}
                  </>
                )}
              </Button>
            )}
          </motion.div>
        </div>

        {/* Tableau comparatif */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass rounded-xl sm:rounded-2xl overflow-hidden"
        >
          <div className="p-4 sm:p-6 border-b border-border/50">
            <h2 className="text-base sm:text-lg font-display font-semibold">
              Comparaison détaillée
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px]">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left px-3 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-medium text-muted-foreground">
                    Fonctionnalité
                  </th>
                  <th className="text-center px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium text-muted-foreground w-20 sm:w-28">
                    Libre
                  </th>
                  <th className="text-center px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium w-20 sm:w-28">
                    <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                      <Zap className="h-3 w-3" />
                      Créateur
                    </span>
                  </th>
                  <th className="text-center px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium w-20 sm:w-28">
                    <span className="inline-flex items-center gap-1 text-violet-600 dark:text-violet-400">
                      <Brain className="h-3 w-3" />
                      Studio
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {features.map((f, i) => (
                  <tr key={f.label} className={i % 2 === 0 ? "bg-muted/20" : ""}>
                    <td className="px-3 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <f.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
                        <span className="line-clamp-1">{f.label}</span>
                      </div>
                    </td>
                    <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-center">
                      <FeatureValue value={f.libre} />
                    </td>
                    <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-center">
                      <FeatureValue value={f.createur} />
                    </td>
                    <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-center">
                      <FeatureValue value={f.studio} />
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
          transition={{ delay: 0.5 }}
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
            {plan === "libre"
              ? "Le compteur est réinitialisé le 1er de chaque mois."
              : `Prochain renouvellement : ${nextResetDate.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}`}
          </p>
        </motion.div>

        <p className="text-xs text-center text-muted-foreground pb-6 sm:pb-8">
          Paiement sécurisé par Stripe. Vous pouvez annuler à tout moment depuis
          la page « Gérer l'abonnement ».
        </p>
      </div>
    </DashboardLayout>
  );
}
