import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { FlaskConical, Trash2, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useNarraMindAlerts } from "@/hooks/useNarramindAlerts";
import { useScenarioChapters } from "@/hooks/useScenarioChapters";
import { supabase } from "@/integrations/supabase/client";
import { ArianeThreadIcon } from "@/components/ariane/ArianeThreadIcon";
import { cn } from "@/lib/utils";
import type { NarrativeAlertSeverity } from "@/types";

const TEST_DEDUPE_PREFIX = "test-admin-";

const TEST_ALERTS: Array<{
  severity: NarrativeAlertSeverity;
  title: string;
  explanation: string;
  label: string;
  color: string;
}> = [
  {
    severity: "info",
    label: "Info",
    color: "bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/35",
    title: "Localisation potentiellement incohérente",
    explanation:
      "Marcus est décrit comme habitant à Lyon dans son lore, mais dans le chapitre il se trouve à Paris sans que le trajet soit mentionné. Vérifiez si ce déplacement est volontaire ou s'il manque une transition narrative.",
  },
  {
    severity: "warning",
    label: "Attention",
    color: "bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/35",
    title: "Objet décrit comme indestructible utilisé différemment",
    explanation:
      "L'épée de Marcus est présentée comme « indestructible » dans le lore de l'univers, mais dans la scène d'affrontement elle est brisée par l'antagoniste. Cette contradiction mérite d'être expliquée ou corrigée avant publication.",
  },
  {
    severity: "critical",
    label: "Important",
    color: "bg-destructive/15 text-destructive border-destructive/35",
    title: "Conflit d'identité entre deux personnages",
    explanation:
      "Le nom « Sara » est utilisé pour désigner deux personnages différents : la mère du héros (lore Marcus) et l'antagoniste principale (chapitre actuel). Ce doublon peut créer une confusion majeure pour le lecteur et doit être résolu.",
  },
];

export function TestSection({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: chapters = [] } = useScenarioChapters(projectId);
  const { data: allAlerts = [] } = useNarraMindAlerts(projectId, { statuses: ["active"] });
  const [injecting, setInjecting] = useState<NarrativeAlertSeverity | null>(null);
  const [cleaning, setCleaning] = useState(false);

  const firstChapter = chapters[0];
  const testAlerts = allAlerts.filter((a) => a.dedupeKey.startsWith(TEST_DEDUPE_PREFIX));

  const injectAlert = async (alert: (typeof TEST_ALERTS)[number]) => {
    if (!user || !firstChapter) return;
    setInjecting(alert.severity);
    try {
      const dedupeKey = `${TEST_DEDUPE_PREFIX}${alert.severity}-${Date.now()}`;
      const { error } = await supabase.from("narramind_alerts").insert({
        user_id: user.id,
        project_id: projectId,
        chapter_id: firstChapter.id,
        severity: alert.severity,
        title: alert.title,
        explanation: alert.explanation,
        status: "active",
        dedupe_key: dedupeKey,
      });
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["narramind-alerts"] });
      toast({ title: `Alerte ${alert.label} injectée`, description: alert.title });
    } catch {
      toast({ title: "Erreur", description: "Impossible d'injecter l'alerte.", variant: "destructive" });
    } finally {
      setInjecting(null);
    }
  };

  const cleanTestAlerts = async () => {
    setCleaning(true);
    try {
      const ids = testAlerts.map((a) => a.id);
      if (ids.length === 0) return;
      const { error } = await supabase
        .from("narramind_alerts")
        .delete()
        .in("id", ids);
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["narramind-alerts"] });
      toast({ title: `${ids.length} alerte${ids.length > 1 ? "s" : ""} supprimée${ids.length > 1 ? "s" : ""}` });
    } catch {
      toast({ title: "Erreur", description: "Impossible de nettoyer.", variant: "destructive" });
    } finally {
      setCleaning(false);
    }
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <div className="glass rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <ArianeThreadIcon size={28} pulse={testAlerts.length > 0} />
          <div>
            <h2 className="font-display font-bold text-lg">Fil d'Ariane — Test</h2>
            <p className="text-sm text-muted-foreground">
              Injecte de fausses alertes pour valider l'affichage du fil d'Ariane.
            </p>
          </div>
          {testAlerts.length > 0 && (
            <Badge className="ml-auto bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/35 border">
              {testAlerts.length} test{testAlerts.length > 1 ? "s" : ""} actifs
            </Badge>
          )}
        </div>

        {!firstChapter && (
          <p className="text-sm text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/25 rounded-lg px-4 py-3">
            Aucun chapitre de scénario disponible — créez-en un d'abord pour pouvoir injecter des alertes.
          </p>
        )}

        <div className="grid gap-3">
          {TEST_ALERTS.map((alert) => (
            <div
              key={alert.severity}
              className="flex items-start gap-4 rounded-xl border border-border/60 bg-background/40 p-4"
            >
              <span
                className={cn(
                  "mt-0.5 shrink-0 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md border",
                  alert.color
                )}
              >
                {alert.label}
              </span>
              <div className="flex-1 min-w-0 space-y-0.5">
                <p className="text-sm font-medium leading-snug">{alert.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                  {alert.explanation}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="shrink-0 gap-1.5 h-8 text-xs"
                disabled={!firstChapter || injecting !== null}
                onClick={() => injectAlert(alert)}
              >
                {injecting === alert.severity ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <FlaskConical className="h-3 w-3" />
                )}
                Injecter
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="glass rounded-2xl p-6 space-y-4">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Trash2 className="h-4 w-4 text-muted-foreground" />
          Nettoyer les alertes de test
        </h3>
        <p className="text-xs text-muted-foreground">
          Supprime définitivement toutes les alertes injectées via ce panneau ({testAlerts.length} active{testAlerts.length > 1 ? "s" : ""}).
        </p>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10"
          disabled={testAlerts.length === 0 || cleaning}
          onClick={cleanTestAlerts}
        >
          {cleaning ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : testAlerts.length === 0 ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
          {testAlerts.length === 0 ? "Aucune alerte de test" : `Supprimer ${testAlerts.length} alerte${testAlerts.length > 1 ? "s" : ""}`}
        </Button>
      </div>
    </div>
  );
}
