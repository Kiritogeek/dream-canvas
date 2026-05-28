import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { FlaskConical, Trash2, Loader2, Check, Globe, Link2, BookMarked, ScanLine, ShieldCheck, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useNarraMindAlerts } from "@/hooks/useNarramindAlerts";
import { useScenarioChapters, useValidateChapter, useUnvalidateChapter } from "@/hooks/useScenarioChapters";
import { useChapters } from "@/hooks/useChapters";
import { useLoreNodes } from "@/hooks/useLoreNodes";
import { useLoreEdges } from "@/hooks/useLoreEdges";
import { useAssets } from "@/hooks/useAssets";
import { useArianeLoreProposals } from "@/hooks/useArianeLoreProposals";
import { supabase } from "@/integrations/supabase/client";
import { ArianeThreadIcon } from "@/components/ariane/ArianeThreadIcon";
import { ArianeOrbitIcon } from "@/components/ariane/ArianeOrbitIcon";
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
  const { data: scenarioChapters = [] } = useScenarioChapters(projectId);
  const { data: canvasChapters = [] } = useChapters(projectId);
  const { data: allAlerts = [] } = useNarraMindAlerts(projectId, { statuses: ["active"] });
  const [injecting, setInjecting] = useState<NarrativeAlertSeverity | null>(null);
  const [cleaning, setCleaning] = useState(false);

  const { data: loreNodes = [] } = useLoreNodes(projectId);
  const { data: loreEdges = [] } = useLoreEdges(projectId);
  const { data: assets = [] } = useAssets(projectId);
  const validateChapter = useValidateChapter();
  const unvalidateChapter = useUnvalidateChapter();
  const { triggerScan, triggerForceScan } = useArianeLoreProposals(projectId, { enableAutoScan: false });
  const [loreInjecting, setLoreInjecting] = useState<string | null>(null);
  const [loreCleaning, setLoreCleaning] = useState(false);
  const [clearingProposals, setClearingProposals] = useState(false);
  const [hasInjectedLore, setHasInjectedLore] = useState(false);
  const [scanRunning, setScanRunning] = useState(false);

  const testLoreEdges = loreEdges.filter((e) => e.label === "Test — connexion");

  const firstChapter = scenarioChapters[0];
  const firstCanvasChapter = canvasChapters[0];
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

  const injectLoreNode = async () => {
    if (!user) return;
    const asset = assets[0];
    if (!asset) {
      toast({ title: "Aucun asset disponible", description: "Créez d'abord un asset dans le projet pour tester cette injection.", variant: "destructive" });
      return;
    }
    setLoreInjecting("node");
    try {
      const dedupeKey = `lore-test-asset-${asset.id}-${Date.now()}`;
      const { error } = await supabase.from("compass_proposals").insert({
        project_id: projectId,
        user_id: user.id,
        proposal_type: "lore_asset",
        origin: "extracted",
        title: asset.name,
        content: asset.name,
        prefill_data: {
          asset_id: asset.id,
          asset_type: asset.asset_type,
          chapter_id: firstCanvasChapter?.id ?? null,
          chapter_number: firstCanvasChapter?.chapter_number ?? null,
        },
        status: "active",
        dedupe_key: dedupeKey,
      });
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["lore-proposals", projectId] });
      setHasInjectedLore(true);
      toast({ title: "Proposition Ariane injectée", description: "Visible dans le bouton Ariane → onglet Univers." });
    } catch {
      toast({ title: "Erreur", variant: "destructive" });
    } finally {
      setLoreInjecting(null);
    }
  };

  const injectLoreEdge = async () => {
    if (!user) return;
    if (loreNodes.length < 2) {
      toast({
        title: "Pas assez d'éléments",
        description: "Acceptez d'abord 2 propositions d'éléments dans l'onglet Univers, puis revenez ici.",
        variant: "destructive",
      });
      return;
    }
    setLoreInjecting("edge");
    try {
      const [a, b] = loreNodes.slice(0, 2);
      const sorted = [a.id, b.id].sort();
      const fromNode = sorted[0] === a.id ? a : b;
      const toNode = sorted[0] === a.id ? b : a;
      const dedupeKey = `lore-test-edge-${Date.now()}`;
      const { error } = await supabase.from("compass_proposals").insert({
        project_id: projectId,
        user_id: user.id,
        proposal_type: "lore_connection",
        origin: "extracted",
        title: `${fromNode.name} ↔ ${toNode.name}`,
        content: "Test — co-présents dans le chapitre",
        prefill_data: {
          from_node_id: fromNode.id,
          to_node_id: toNode.id,
          from_name: fromNode.name,
          to_name: toNode.name,
          chapter_number: firstChapter?.chapter_number ?? 1,
          proposed_label: "Test",
        },
        status: "active",
        dedupe_key: dedupeKey,
      });
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["lore-proposals", projectId] });
      setHasInjectedLore(true);
      toast({ title: "Proposition de connexion injectée", description: "Visible dans Ariane → onglet Univers." });
    } catch {
      toast({ title: "Erreur", variant: "destructive" });
    } finally {
      setLoreInjecting(null);
    }
  };

  const injectChapterLink = async () => {
    if (!user) return;
    // Utilise les chapitres scénario pour la garde (l'utilisateur crée d'abord dans Scénario)
    const firstScenarioChapter = scenarioChapters[0];
    if (!firstScenarioChapter) {
      toast({ title: "Aucun chapitre Scénario", description: "Créez au moins un chapitre dans l'onglet Scénario.", variant: "destructive" });
      return;
    }
    if (loreNodes.length === 0) {
      toast({ title: "Aucun élément dans l'Univers", description: "Acceptez d'abord une proposition d'élément dans l'onglet Univers.", variant: "destructive" });
      return;
    }
    setLoreInjecting("chapter");
    try {
      const node = loreNodes[0];
      // Recherche le chapitre canvas correspondant (même chapter_number) — peut être null
      const matchingCanvas = canvasChapters.find(
        (c) => c.chapter_number === firstScenarioChapter.chapter_number
      );
      const dedupeKey = `lore-test-chapter-${node.id}-${Date.now()}`;
      const { error } = await supabase.from("compass_proposals").insert({
        project_id: projectId,
        user_id: user.id,
        proposal_type: "lore_chapter_update",
        origin: "extracted",
        title: node.name,
        content: node.name,
        prefill_data: {
          node_id: node.id,
          asset_id: node.asset_id,
          chapter_id: matchingCanvas?.id ?? null,
          chapter_number: firstScenarioChapter.chapter_number,
          current_chapter_id: null,
        },
        status: "active",
        dedupe_key: dedupeKey,
      });
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["lore-proposals", projectId] });
      setHasInjectedLore(true);
      toast({ title: "Proposition de lien chapitre injectée dans l'Univers" });
    } catch {
      toast({ title: "Erreur", variant: "destructive" });
    } finally {
      setLoreInjecting(null);
    }
  };

  const clearAllUniversProposals = async () => {
    setClearingProposals(true);
    try {
      const { error } = await supabase
        .from("compass_proposals")
        .delete()
        .eq("project_id", projectId)
        .in("proposal_type", ["lore_asset", "lore_chapter_update", "lore_connection", "lore_event"]);
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["lore-proposals", projectId] });
      toast({ title: "Toutes les propositions Univers supprimées" });
    } catch {
      toast({ title: "Erreur", variant: "destructive" });
    } finally {
      setClearingProposals(false);
    }
  };

  const cleanLoreTest = async () => {
    setLoreCleaning(true);
    try {
      if (testLoreEdges.length > 0) {
        await supabase.from("lore_edges").delete().in("id", testLoreEdges.map((e) => e.id));
      }
      await supabase.from("compass_proposals")
        .delete()
        .eq("project_id", projectId)
        .like("dedupe_key", "lore-test-%");
      await qc.invalidateQueries({ queryKey: ["lore-edges", projectId] });
      await qc.invalidateQueries({ queryKey: ["lore-proposals", projectId] });
      setHasInjectedLore(false);
      toast({ title: "Données Univers de test supprimées" });
    } catch {
      toast({ title: "Erreur", variant: "destructive" });
    } finally {
      setLoreCleaning(false);
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

      {/* Univers */}
      <div className="glass rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Globe className="h-6 w-6 text-amber-400" />
          <div>
            <h2 className="font-display font-bold text-lg">Univers — Test</h2>
            <p className="text-sm text-muted-foreground">
              Injecte des données de test dans l'Univers (nœuds, connexions, propositions de lien).
            </p>
          </div>
        </div>
        <div className="grid gap-3">
          {[
            { key: "node", icon: Globe, label: "Proposition d'élément", desc: "Injecte une lore_asset proposal → à accepter dans l'onglet Univers (nécessite un asset)." },
            { key: "edge", icon: Link2, label: "Proposition de connexion", desc: "Injecte une lore_connection proposal → à accepter dans Ariane (nécessite 2 éléments dans l'Univers)." },
            { key: "chapter", icon: BookMarked, label: "Proposition lien chapitre", desc: "Injecte une lore_chapter_update proposal pour le 1er élément Univers → nécessite un chapitre Scénario." },
          ].map(({ key, icon: Icon, label, desc }) => (
            <div key={key} className="flex items-start gap-4 rounded-xl border border-border/60 bg-background/40 p-4">
              <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0 space-y-0.5">
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="shrink-0 gap-1.5 h-8 text-xs"
                disabled={loreInjecting !== null}
                onClick={key === "node" ? injectLoreNode : key === "edge" ? injectLoreEdge : injectChapterLink}
              >
                {loreInjecting === key ? <Loader2 className="h-3 w-3 animate-spin" /> : <FlaskConical className="h-3 w-3" />}
                Injecter
              </Button>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {(hasInjectedLore || testLoreEdges.length > 0) && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10"
              disabled={loreCleaning}
              onClick={cleanLoreTest}
            >
              {loreCleaning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              Supprimer les données Univers de test
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10"
            disabled={clearingProposals}
            onClick={clearAllUniversProposals}
          >
            {clearingProposals ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            Vider toutes les propositions
          </Button>
        </div>
      </div>

      {/* Ariane Univers — Scan manuel */}
      <div className="glass rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <ArianeOrbitIcon size={28} />
          <div>
            <h2 className="font-display font-bold text-lg">Ariane Univers — Scan manuel</h2>
            <p className="text-sm text-muted-foreground">
              Simule la validation d'un chapitre et déclenche le scan Ariane immédiatement.
            </p>
          </div>
        </div>

        {!firstChapter ? (
          <p className="text-sm text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/25 rounded-lg px-4 py-3">
            Aucun chapitre de scénario — créez-en un dans l'onglet Scénario.
          </p>
        ) : (
          <div className="space-y-3">
            {/* Statut chapitres */}
            <div className="flex flex-wrap gap-2">
              {scenarioChapters.map((ch) => (
                <span
                  key={ch.id}
                  className={cn(
                    "inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg border",
                    ch.validated
                      ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                      : "bg-muted/40 border-border/60 text-muted-foreground"
                  )}
                >
                  {ch.validated ? <ShieldCheck className="h-3 w-3" /> : <Unlock className="h-3 w-3 opacity-50" />}
                  Chap. {ch.chapter_number}
                  {ch.validated ? " — validé" : " — non validé"}
                </span>
              ))}
            </div>

            <div className="grid gap-3">
              {/* Valider + Scanner */}
              <div className="flex items-start gap-4 rounded-xl border border-border/60 bg-background/40 p-4">
                <ShieldCheck className="h-4 w-4 mt-0.5 text-emerald-400 shrink-0" />
                <div className="flex-1 min-w-0 space-y-0.5">
                  <p className="text-sm font-medium">Valider Chap. {firstChapter.chapter_number} + Scanner</p>
                  <p className="text-xs text-muted-foreground">
                    Marque le chapitre comme validé (comme en prod) puis lance le scan Ariane immédiatement.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0 gap-1.5 h-8 text-xs"
                  disabled={scanRunning || validateChapter.isPending}
                  onClick={async () => {
                    setScanRunning(true);
                    try {
                      if (!firstChapter.validated) {
                        await validateChapter.mutateAsync({ id: firstChapter.id, projectId });
                      }
                      await triggerForceScan();
                      toast({ title: "Scan Ariane terminé", description: "Toutes les propositions remontent — celles en rouge étaient ignorées." });
                    } catch {
                      toast({ title: "Erreur lors du scan", variant: "destructive" });
                    } finally {
                      setScanRunning(false);
                    }
                  }}
                >
                  {scanRunning ? <Loader2 className="h-3 w-3 animate-spin" /> : <ScanLine className="h-3 w-3" />}
                  Valider + Scanner
                </Button>
              </div>

              {/* Scanner uniquement */}
              <div className="flex items-start gap-4 rounded-xl border border-border/60 bg-background/40 p-4">
                <ScanLine className="h-4 w-4 mt-0.5 text-amber-400 shrink-0" />
                <div className="flex-1 min-w-0 space-y-0.5">
                  <p className="text-sm font-medium">Scanner uniquement</p>
                  <p className="text-xs text-muted-foreground">
                    Lance le scan sans changer l'état de validation — utile pour tester avec des chapitres déjà validés.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0 gap-1.5 h-8 text-xs"
                  disabled={scanRunning}
                  onClick={async () => {
                    setScanRunning(true);
                    try {
                      await triggerScan();
                      await qc.invalidateQueries({ queryKey: ["lore-proposals", projectId] });
                      toast({ title: "Scan Ariane terminé" });
                    } catch {
                      toast({ title: "Erreur lors du scan", variant: "destructive" });
                    } finally {
                      setScanRunning(false);
                    }
                  }}
                >
                  {scanRunning ? <Loader2 className="h-3 w-3 animate-spin" /> : <ScanLine className="h-3 w-3" />}
                  Scanner
                </Button>
              </div>

              {/* Dévalider */}
              {scenarioChapters.some((ch) => ch.validated) && (
                <div className="flex items-start gap-4 rounded-xl border border-border/60 bg-background/40 p-4">
                  <Unlock className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <p className="text-sm font-medium">Dévalider tous les chapitres</p>
                    <p className="text-xs text-muted-foreground">
                      Remet tous les chapitres en état "non validé" pour repartir d'un état propre.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 gap-1.5 h-8 text-xs border-destructive/40 text-destructive hover:bg-destructive/10"
                    disabled={unvalidateChapter.isPending}
                    onClick={async () => {
                      for (const ch of scenarioChapters.filter((c) => c.validated)) {
                        await unvalidateChapter.mutateAsync({ id: ch.id, projectId });
                      }
                      toast({ title: "Chapitres dévalidés" });
                    }}
                  >
                    {unvalidateChapter.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Unlock className="h-3 w-3" />}
                    Dévalider
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
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
