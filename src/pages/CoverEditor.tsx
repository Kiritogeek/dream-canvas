import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Loader2, Sparkles, Check, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProject } from "@/hooks/useProjects";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { generateCoverIllustration, saveCover } from "@/services/cover";
import { buildSfxTextShadow } from "@/components/chapter/sfxSystemStyle";
import { FONTS } from "@/components/chapter/bubbleFonts";
import { parseProjectMeta } from "@/lib/projectMeta";
import DashboardLayout from "@/components/DashboardLayout";

const COVER_W = 800;
const COVER_H = 1200;
type TitlePos = "top" | "center" | "bottom";
const POS_Y: Record<TitlePos, number> = { top: 190, center: 600, bottom: 1010 };

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export default function CoverEditor() {
  const { id: projectId } = useParams<{ id: string }>();
  const { data: project } = useProject(projectId);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [illustrationUrl, setIllustrationUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [font, setFont] = useState("'Bangers', cursive");
  const [color, setColor] = useState("#ffffff");
  const [strokeColor, setStrokeColor] = useState("#111111");
  const [strokeWidth, setStrokeWidth] = useState(6);
  const [fontSize, setFontSize] = useState(96);
  const [pos, setPos] = useState<TitlePos>("bottom");

  useEffect(() => {
    if (project?.title) setTitle(project.title);
    if (project?.cover_url) setIllustrationUrl(project.cover_url);
  }, [project?.title, project?.cover_url]);

  const hasStyle = !!project?.style_template?.trim();
  const meta = parseProjectMeta(project?.description);

  const handleGenerate = async () => {
    if (!projectId) return;
    setGenerating(true);
    try {
      const { image_url } = await generateCoverIllustration(projectId);
      setIllustrationUrl(image_url);
      toast({ title: "Illustration générée", description: "Ajuste le titre puis valide la couverture." });
    } catch (err) {
      toast({ title: "Erreur de génération", description: (err as Error).message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handleValidate = async () => {
    if (!projectId || !user?.id || !illustrationUrl) return;
    setSaving(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = COVER_W;
      canvas.height = COVER_H;
      const ctx = canvas.getContext("2d")!;
      const img = await loadImage(illustrationUrl);
      // Cover-fit : remplit le cadre en préservant le ratio.
      const scale = Math.max(COVER_W / img.width, COVER_H / img.height);
      const dw = img.width * scale;
      const dh = img.height * scale;
      ctx.drawImage(img, (COVER_W - dw) / 2, (COVER_H - dh) / 2, dw, dh);

      const t = title.trim();
      if (t) {
        ctx.font = `${fontSize}px ${font}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.lineJoin = "round";
        const y = POS_Y[pos];
        if (strokeWidth > 0) {
          ctx.lineWidth = strokeWidth * 2;
          ctx.strokeStyle = strokeColor;
          ctx.strokeText(t, COVER_W / 2, y);
        }
        ctx.fillStyle = color;
        ctx.fillText(t, COVER_W / 2, y);
      }

      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
      if (!blob) throw new Error("Échec du rendu de la couverture");
      await saveCover(user.id, projectId, blob);
      await queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast({ title: "Couverture validée", description: "Elle est maintenant l'affiche de ton projet." });
      navigate(`/dashboard/projects/${projectId}?tab=edition`);
    } catch (err) {
      toast({ title: "Erreur", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const titleShadow = buildSfxTextShadow({ strokeColor, strokeWidth, glowColor: undefined, glowBlur: undefined });

  return (
    <DashboardLayout>
      <div className="mb-4">
        <Link to={`/dashboard/projects/${projectId}?tab=edition`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Retour à l'Édition
        </Link>
        <h1 className="text-xl sm:text-2xl font-display font-bold mt-2">Couverture du webtoon</h1>
        <p className="text-sm text-muted-foreground mt-1">
          L'affiche que verra le lecteur. Générée à partir du style, des personnages, du genre et de la tonalité du projet.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Aperçu portrait */}
        <div className="flex-1 flex justify-center">
          <div
            className="relative rounded-xl overflow-hidden border border-border shadow-lg bg-muted"
            style={{ width: 400, height: 600 }}
          >
            {illustrationUrl ? (
              <img src={illustrationUrl} alt="Illustration de couverture" className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                <ImageIcon className="h-10 w-10 opacity-40" />
                <span className="text-sm">Aucune illustration générée</span>
              </div>
            )}
            {illustrationUrl && title.trim() && (
              <div
                className="absolute left-0 right-0 px-4 text-center pointer-events-none"
                style={{
                  top: `${(POS_Y[pos] / COVER_H) * 100}%`,
                  transform: "translateY(-50%)",
                  fontFamily: font,
                  fontSize: fontSize / 2,
                  color,
                  textShadow: titleShadow || undefined,
                  lineHeight: 1.05,
                }}
              >
                {title}
              </div>
            )}
          </div>
        </div>

        {/* Contrôles */}
        <div className="w-full lg:w-[340px] space-y-5">
          <div className="glass rounded-2xl p-5 space-y-4">
            <Button onClick={handleGenerate} disabled={generating || saving || !hasStyle} className="w-full gradient-primary text-primary-foreground">
              {generating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Génération…</> : <><Sparkles className="h-4 w-4 mr-2" /> {illustrationUrl ? "Régénérer l'illustration" : "Générer l'illustration"}</>}
            </Button>
            {!hasStyle && (
              <p className="text-[11px] text-amber-500/90">Définis d'abord un style dans l'onglet Style.</p>
            )}
            {(!meta.genre || !meta.tone) && (
              <p className="text-[11px] text-muted-foreground">Astuce : renseigne genre et tonalité dans Paramètres pour une couverture plus fidèle.</p>
            )}
          </div>

          <div className="glass rounded-2xl p-5 space-y-4">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Titre stylisé</span>
            <div className="space-y-2">
              <Label className="text-xs">Texte</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Police</Label>
              <select value={font} onChange={(e) => setFont(e.target.value)} className="w-full h-9 rounded-lg border border-border bg-background text-sm px-2.5 cursor-pointer" style={{ fontFamily: font }}>
                {FONTS.filter((f) => f.value !== "inherit").map((f) => (
                  <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>{f.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Couleur</Label>
                <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-9 w-12 rounded border border-border cursor-pointer bg-transparent" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Contour</Label>
                <input type="color" value={strokeColor} onChange={(e) => setStrokeColor(e.target.value)} className="h-9 w-12 rounded border border-border cursor-pointer bg-transparent" />
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Épaisseur ({strokeWidth})</Label>
                <input type="range" min={0} max={14} value={strokeWidth} onChange={(e) => setStrokeWidth(parseInt(e.target.value, 10))} className="w-full accent-primary" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Taille ({fontSize}px)</Label>
              <input type="range" min={40} max={180} step={2} value={fontSize} onChange={(e) => setFontSize(parseInt(e.target.value, 10))} className="w-full accent-primary" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Position</Label>
              <div className="flex gap-1.5">
                {(["top", "center", "bottom"] as TitlePos[]).map((p) => (
                  <button key={p} type="button" onClick={() => setPos(p)}
                    className={`flex-1 h-8 rounded-lg border text-xs font-medium transition-colors ${pos === p ? "border-primary/60 bg-primary/15 text-primary" : "border-border/70 text-muted-foreground hover:bg-muted/50"}`}>
                    {p === "top" ? "Haut" : p === "center" ? "Centre" : "Bas"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <Button onClick={handleValidate} disabled={!illustrationUrl || saving || generating} className="w-full gradient-primary text-primary-foreground">
            {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enregistrement…</> : <><Check className="h-4 w-4 mr-2" /> Valider la couverture</>}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
