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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useUserPlan } from "@/hooks/useUserPlan";
import DashboardLayout from "@/components/DashboardLayout";
import type { UserPlan } from "@/types";
import { TIER_CONFIG } from "@/types";

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
    label: "Vues multiples (profil, dos)",
    icon: Eye,
    free: false,
    pro: true,
  },
  {
    label: "Résolution",
    icon: Image,
    free: "1024×1024",
    pro: "1024×1024",
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
  const { plan, usageInfo, changePlan } = useUserPlan();

  const handleChangePlan = (targetPlan: UserPlan) => {
    if (targetPlan === plan) return;

    changePlan.mutate(targetPlan, {
      onSuccess: () => {
        toast({
          title:
            targetPlan === "pro"
              ? "Bienvenue dans le plan Pro !"
              : "Retour au plan Free",
          description:
            targetPlan === "pro"
              ? "Vous avez maintenant accès à toutes les fonctionnalités."
              : "Votre plan a été rétrogradé. Vos données sont conservées.",
        });
      },
      onError: (err) => {
        toast({
          title: "Erreur",
          description: err.message,
          variant: "destructive",
        });
      },
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-3"
        >
          <h1 className="text-3xl font-display font-bold">
            Choisissez votre plan
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Commencez gratuitement et passez au Pro quand vous êtes prêt à
            libérer tout le potentiel de DreamWeave.
          </p>
        </motion.div>

        {/* Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Free Plan */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={`glass rounded-2xl p-6 space-y-6 border-2 transition-colors ${
              plan === "free"
                ? "border-primary shadow-dream"
                : "border-transparent"
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-xl font-display font-bold">Free</h2>
                {plan === "free" && (
                  <span className="ml-auto px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                    Plan actuel
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-display font-bold">0 €</span>
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

            {plan === "free" ? (
              <Button variant="outline" className="w-full" disabled>
                Plan actuel
              </Button>
            ) : (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleChangePlan("free")}
                disabled={changePlan.isPending}
              >
                {changePlan.isPending ? "Changement..." : "Passer au Free"}
              </Button>
            )}
          </motion.div>

          {/* Pro Plan */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`relative glass rounded-2xl p-6 space-y-6 border-2 transition-colors ${
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
                <h2 className="text-xl font-display font-bold">Pro</h2>
                {plan === "pro" && (
                  <span className="ml-auto px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-semibold">
                    Plan actuel
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-display font-bold">14,99 €</span>
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
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600"
                disabled
              >
                Plan actuel
              </Button>
            ) : (
              <Button
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 shadow-lg"
                onClick={() => handleChangePlan("pro")}
                disabled={changePlan.isPending}
              >
                {changePlan.isPending ? (
                  "Changement..."
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

        {/* Tableau comparatif */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass rounded-2xl overflow-hidden"
        >
          <div className="p-6 border-b border-border/50">
            <h2 className="text-lg font-display font-semibold">
              Comparaison détaillée
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">
                    Fonctionnalité
                  </th>
                  <th className="text-center px-6 py-3 text-sm font-medium text-muted-foreground w-36">
                    Free
                  </th>
                  <th className="text-center px-6 py-3 text-sm font-medium w-36">
                    <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                      <Zap className="h-3.5 w-3.5" />
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
                    <td className="px-6 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <f.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                        {f.label}
                      </div>
                    </td>
                    <td className="px-6 py-3 text-center">
                      <FeatureValue value={f.free} />
                    </td>
                    <td className="px-6 py-3 text-center">
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
          className="glass rounded-2xl p-6 space-y-4"
        >
          <h2 className="text-lg font-display font-semibold">
            Votre utilisation ce mois-ci
          </h2>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Générations d'images
            </span>
            <span className="text-sm font-medium">
              {usageInfo.count} / {usageInfo.limit}
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full transition-all duration-500 ${
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
        <p className="text-xs text-center text-muted-foreground pb-8">
          Le paiement sera bientôt disponible via Stripe. En attendant, vous
          pouvez tester le plan Pro directement.
        </p>
      </div>
    </DashboardLayout>
  );
}
