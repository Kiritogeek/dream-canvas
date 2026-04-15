import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, Lock, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/ThemeToggle";

const MIN_PASSWORD_LENGTH = 6;

// Fonction pour parser les paramètres depuis le hash (#) ou les query params (?)
function parseUrlParams(): { [key: string]: string } {
  const params: { [key: string]: string } = {};
  
  // Parser les query params (?token=...&type=...)
  const searchParams = new URLSearchParams(window.location.search);
  searchParams.forEach((value, key) => {
    params[key] = value;
  });
  
  // Parser le hash (#access_token=...&type=...)
  const hash = window.location.hash.substring(1);
  if (hash) {
    const hashParams = new URLSearchParams(hash);
    hashParams.forEach((value, key) => {
      params[key] = value;
    });
  }
  
  return params;
}

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { updatePassword } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [triedSubmit, setTriedSubmit] = useState(false);
  const [status, setStatus] = useState<"loading" | "ready" | "success" | "error">("loading");
  const [message, setMessage] = useState("Vérification du lien de réinitialisation...");

  useEffect(() => {
    const verifyResetLink = async () => {
      // Parser les paramètres depuis l'URL
      const urlParams = parseUrlParams();
      const accessToken = urlParams.access_token;
      const refreshToken = urlParams.refresh_token;
      const tokenHash = urlParams.token_hash;
      const type = urlParams.type;

      // Si on a un access_token dans le hash, Supabase a déjà vérifié le lien
      if (accessToken && refreshToken) {
        try {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            console.error("Erreur lors de la création de session:", error);
            setStatus("error");
            setMessage("Le lien de réinitialisation est invalide ou a expiré.");
            return;
          }

          if (data.session && data.user) {
            setStatus("ready");
            setMessage("");
            // Nettoyer le hash de l'URL
            window.history.replaceState(null, "", window.location.pathname);
            return;
          }
        } catch (err) {
          console.error("Erreur:", err);
          setStatus("error");
          setMessage("Une erreur est survenue lors de la vérification du lien.");
          return;
        }
      }

      // Si on a un token_hash, essayer de vérifier avec verifyOtp
      if (tokenHash && type === "recovery") {
        try {
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: "recovery",
          });

          if (error) {
            console.error("Erreur de vérification:", error);
            if (error.message.includes("expired")) {
              setStatus("error");
              setMessage("Le lien de réinitialisation a expiré. Veuillez demander un nouveau lien.");
            } else {
              setStatus("error");
              setMessage("Le lien de réinitialisation est invalide.");
            }
            return;
          }

          if (data.user && data.session) {
            setStatus("ready");
            setMessage("");
            window.history.replaceState(null, "", window.location.pathname);
            return;
          }
        } catch (err) {
          console.error("Erreur:", err);
          setStatus("error");
          setMessage("Une erreur est survenue lors de la vérification.");
          return;
        }
      }

      // Vérifier si l'utilisateur est déjà connecté avec une session valide
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setStatus("ready");
        setMessage("");
        return;
      }

      // Pas de token valide trouvé
      console.error("Aucun token de réinitialisation trouvé dans l'URL");
      setStatus("error");
      setMessage("Lien de réinitialisation invalide ou manquant. Vérifiez que vous avez cliqué sur le bon lien dans l'email.");
    };

    verifyResetLink();
  }, [searchParams]);

  const errors = {
    password: password.length > 0 && password.length < MIN_PASSWORD_LENGTH 
      ? `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères`
      : undefined,
    confirmPassword: confirmPassword.length > 0 && password !== confirmPassword
      ? "Les mots de passe ne correspondent pas"
      : undefined,
  };

  const isValid = password.length >= MIN_PASSWORD_LENGTH && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTriedSubmit(true);

    if (!isValid) {
      toast({
        title: "Formulaire invalide",
        description: "Veuillez remplir tous les champs correctement.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await updatePassword(password);
      setStatus("success");
      toast({
        title: "Mot de passe mis à jour",
        description: "Votre mot de passe a été modifié avec succès.",
      });
      setTimeout(() => {
        navigate("/auth");
      }, 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur lors de la mise à jour du mot de passe";
      setStatus("error");
      setMessage(msg);
      toast({
        title: "Erreur",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-dream flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center gap-2 mb-4 sm:mb-6">
            <ThemeToggle />
            <Link to="/" className="inline-flex items-center gap-2">
              <Sparkles className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
              <span className="font-display text-xl sm:text-2xl font-bold text-gradient">DreamWeave</span>
            </Link>
          </div>
          <h1 className="text-xl sm:text-2xl font-display font-bold">
            Réinitialiser le mot de passe
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            {status === "loading" 
              ? "Vérification du lien..." 
              : status === "ready"
                ? "Choisissez un nouveau mot de passe"
                : status === "success"
                  ? "Mot de passe mis à jour avec succès"
                  : "Erreur"}
          </p>
        </div>

        <div className="glass rounded-xl sm:rounded-2xl p-5 sm:p-8 shadow-dream">
          {status === "loading" && (
            <div className="text-center py-8">
              <Loader2 className="h-12 w-12 mx-auto mb-4 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">{message}</p>
            </div>
          )}

          {status === "success" && (
            <div className="text-center py-8">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <h2 className="text-lg font-display font-bold mb-2 text-green-600 dark:text-green-400">
                Mot de passe mis à jour !
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                Vous allez être redirigé vers la page de connexion...
              </p>
              <Button
                onClick={() => navigate("/auth")}
                className="w-full gradient-primary text-primary-foreground shadow-dream"
              >
                Se connecter
              </Button>
            </div>
          )}

          {status === "error" && (
            <div className="text-center py-8">
              <XCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
              <h2 className="text-lg font-display font-bold mb-2 text-destructive">
                Erreur
              </h2>
              <p className="text-sm text-muted-foreground mb-6">{message}</p>
              <div className="space-y-2">
                <Button
                  onClick={() => navigate("/auth")}
                  className="w-full gradient-primary text-primary-foreground shadow-dream"
                >
                  Retour à la connexion
                </Button>
                <Button
                  onClick={() => navigate("/auth")}
                  variant="outline"
                  className="w-full"
                >
                  Demander un nouveau lien
                </Button>
              </div>
            </div>
          )}

          {status === "ready" && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password" className={triedSubmit && errors.password ? "text-destructive" : ""}>
                  Nouveau mot de passe
                </Label>
                <div className="relative">
                  <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${triedSubmit && errors.password ? "text-destructive" : "text-muted-foreground"}`} />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (triedSubmit && errors.password) {
                        setTriedSubmit(false);
                      }
                    }}
                    className={`pl-10 ${triedSubmit && errors.password ? "border-destructive focus-visible:ring-destructive" : ""}`}
                    autoComplete="new-password"
                  />
                </div>
                {triedSubmit && errors.password && (
                  <p className="text-sm text-destructive">{errors.password}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className={triedSubmit && errors.confirmPassword ? "text-destructive" : ""}>
                  Confirmer le mot de passe
                </Label>
                <div className="relative">
                  <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${triedSubmit && errors.confirmPassword ? "text-destructive" : "text-muted-foreground"}`} />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (triedSubmit && errors.confirmPassword) {
                        setTriedSubmit(false);
                      }
                    }}
                    className={`pl-10 ${triedSubmit && errors.confirmPassword ? "border-destructive focus-visible:ring-destructive" : ""}`}
                    autoComplete="new-password"
                  />
                </div>
                {triedSubmit && errors.confirmPassword && (
                  <p className="text-sm text-destructive">{errors.confirmPassword}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full gradient-primary text-primary-foreground shadow-dream"
                disabled={loading || !isValid}
                title={!isValid ? "Veuillez remplir tous les champs correctement" : undefined}
              >
                {loading ? "Mise à jour..." : "Réinitialiser le mot de passe"}
              </Button>

              <div className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate("/auth")}
                >
                  Retour à la connexion
                </Button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
