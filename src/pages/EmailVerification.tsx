import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, Mail, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/ThemeToggle";

// Fonction pour parser les paramètres depuis le hash (#) ou les query params (?)
function parseUrlParams(): { [key: string]: string } {
  const params: { [key: string]: string } = {};
  
  // Parser les query params (?token=...&type=...)
  const searchParams = new URLSearchParams(window.location.search);
  searchParams.forEach((value, key) => {
    params[key] = value;
  });
  
  // Parser le hash (#access_token=...&type=...)
  const hash = window.location.hash.substring(1); // Enlever le #
  if (hash) {
    const hashParams = new URLSearchParams(hash);
    hashParams.forEach((value, key) => {
      params[key] = value;
    });
  }
  
  return params;
}

export default function EmailVerification() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [status, setStatus] = useState<"loading" | "pending" | "success" | "error" | "expired">("loading");
  const [message, setMessage] = useState("Vérification de votre email en cours...");

  useEffect(() => {
    let authSubscription: { unsubscribe: () => void } | null = null;

    // Écouter les changements d'état d'authentification
    // Supabase peut automatiquement créer une session quand l'utilisateur clique sur le lien
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (import.meta.env.DEV && event !== "INITIAL_SESSION") {
        console.debug("Changement d'état auth:", event, session?.user?.email);
      }

      if (event === "SIGNED_IN" && session?.user) {
        // Vérifier si l'email est confirmé
        if (session.user.email_confirmed_at) {
          if (import.meta.env.DEV) console.log("Utilisateur connecté avec email confirmé");
          setStatus("success");
          setMessage("Votre email a été vérifié avec succès ! Vous êtes maintenant connecté.");
          toast({
            title: "Email vérifié",
            description: "Votre compte est maintenant actif.",
          });
          // Nettoyer l'URL
          window.history.replaceState(null, "", window.location.pathname);
          setTimeout(() => {
            navigate("/dashboard");
          }, 2000);
        }
      }
    });
    
    authSubscription = subscription;

    const verifyEmail = async () => {
      // Parser les paramètres depuis l'URL (query params et hash)
      const urlParams = parseUrlParams();
      
      const token = urlParams.token || searchParams.get("token");
      const type = urlParams.type || searchParams.get("type");
      const tokenHash = urlParams.token_hash || searchParams.get("token_hash");
      const accessToken = urlParams.access_token;
      const refreshToken = urlParams.refresh_token;
      
      if (import.meta.env.DEV) {
        console.debug("[verify-email] Paramètres", {
          hasToken: !!token,
          hasTokenHash: !!tokenHash,
          hasAccessToken: !!accessToken,
          pending: searchParams.get("pending"),
        });
      }

      const pendingSignup = searchParams.get("pending") === "signup";
      const emailFromQuery = searchParams.get("email");
      if (
        pendingSignup &&
        emailFromQuery &&
        !tokenHash &&
        !token &&
        !accessToken
      ) {
        const { data: { session: pendingSession } } = await supabase.auth.getSession();
        if (pendingSession?.user?.email_confirmed_at) {
          setStatus("success");
          setMessage("Votre email est déjà vérifié ! Vous êtes connecté.");
          window.history.replaceState(null, "", window.location.pathname);
          setTimeout(() => navigate("/dashboard"), 1500);
          return;
        }
        setStatus("pending");
        setMessage(
          `Un email de confirmation devrait arriver sur ${emailFromQuery}. Vérifiez les courriers indésirables et l’onglet Promotions (Gmail).`
        );
        return;
      }

      // Si on a un access_token dans le hash, Supabase a déjà vérifié l'email
      // C'est le cas quand la vérification se fait automatiquement via le hash
      if (accessToken && refreshToken) {
        try {
          if (import.meta.env.DEV) console.log("Tentative de connexion avec access_token depuis le hash");
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            console.error("Erreur lors de la création de session:", error);
            throw error;
          }

          if (data.user && data.session) {
            if (import.meta.env.DEV) console.log("Session créée avec succès, email vérifié");
            setStatus("success");
            setMessage("Votre email a été vérifié avec succès ! Vous êtes maintenant connecté.");
            toast({
              title: "Email vérifié",
              description: "Votre compte est maintenant actif.",
            });
            // Nettoyer le hash de l'URL
            window.history.replaceState(null, "", window.location.pathname);
            // Rediriger vers le dashboard après 2 secondes
            setTimeout(() => {
              navigate("/dashboard");
            }, 2000);
            return;
          }
        } catch (err) {
          console.error("Erreur lors de la création de session:", err);
          // Continuer avec les autres méthodes de vérification
        }
      }

      // Si on a un token_hash, c'est le nouveau format de Supabase
      if (tokenHash && (type === "signup" || type === "email")) {
        try {
          if (import.meta.env.DEV) console.log("Tentative de vérification avec token_hash");
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type === "email" ? "email" : "signup",
          });

          if (error) {
            console.error("Erreur de vérification:", error);
            if (error.message.includes("expired") || error.message.includes("expiré")) {
              setStatus("expired");
              setMessage("Le lien de vérification a expiré. Veuillez demander un nouveau lien.");
            } else {
              setStatus("error");
              setMessage(`Erreur lors de la vérification: ${error.message}`);
            }
            return;
          }

          if (data.user) {
            if (import.meta.env.DEV) console.log("Email vérifié avec succès via token_hash");
            setStatus("success");
            setMessage("Votre email a été vérifié avec succès ! Vous pouvez maintenant vous connecter.");
            toast({
              title: "Email vérifié",
              description: "Votre compte est maintenant actif. Vous pouvez vous connecter.",
            });
            // Nettoyer l'URL
            window.history.replaceState(null, "", window.location.pathname);
            // Rediriger vers la page de connexion après 2 secondes
            setTimeout(() => {
              navigate("/auth");
            }, 2000);
            return;
          }
        } catch (err) {
          console.error("Erreur:", err);
          setStatus("error");
          setMessage("Une erreur est survenue lors de la vérification.");
          return;
        }
      }

      // Si on a un token classique (ancien format)
      if (token && (type === "signup" || type === "email")) {
        try {
          if (import.meta.env.DEV) console.log("Tentative de vérification avec token classique");
          const { data, error } = await supabase.auth.verifyOtp({
            token,
            type: type === "email" ? "email" : "signup",
          });

          if (error) {
            console.error("Erreur de vérification:", error);
            if (error.message.includes("expired")) {
              setStatus("expired");
              setMessage("Le lien de vérification a expiré. Veuillez demander un nouveau lien.");
            } else {
              setStatus("error");
              setMessage(`Erreur lors de la vérification: ${error.message}`);
            }
            return;
          }

          if (data.user) {
            if (import.meta.env.DEV) console.log("Email vérifié avec succès via token");
            setStatus("success");
            setMessage("Votre email a été vérifié avec succès !");
            window.history.replaceState(null, "", window.location.pathname);
            setTimeout(() => {
              navigate("/auth");
            }, 2000);
            return;
          }
        } catch (err) {
          console.error("Erreur:", err);
          setStatus("error");
          setMessage("Une erreur est survenue lors de la vérification.");
          return;
        }
      }

      // Si aucun token n'est trouvé, vérifier si l'utilisateur est déjà connecté
      // (peut arriver si la vérification s'est faite automatiquement)
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        if (import.meta.env.DEV) console.log("Utilisateur déjà connecté, vérification peut-être déjà effectuée");
        // Vérifier si l'email est confirmé
        if (session.user.email_confirmed_at) {
          setStatus("success");
          setMessage("Votre email est déjà vérifié ! Vous êtes connecté.");
          setTimeout(() => {
            navigate("/dashboard");
          }, 2000);
          return;
        }
      }

      // Pas de token dans l'URL et utilisateur non connecté
      if (import.meta.env.DEV) console.warn("Aucun token de vérification dans l’URL");
      setStatus("error");
      setMessage(
        "Lien de vérification invalide ou manquant. Utilise « Renvoyer l’email » ci-dessous avec la même adresse que lors de l’inscription, ou vérifie la configuration Supabase (SMTP, URL du site)."
      );
    };

    verifyEmail();

    return () => {
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
    };
  }, [searchParams, navigate, toast, user]);

  const handleResendEmail = async () => {
    const email = searchParams.get("email") || user?.email;
    if (!email) {
      toast({
        title: "Erreur",
        description: "Impossible de renvoyer l'email. Veuillez réessayer l'inscription.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/verify-email`,
        },
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Email renvoyé",
        description:
          "Si vous ne voyez toujours rien : courriers indésirables, onglet Promotions, et vérifiez dans Supabase (SMTP / journaux Auth).",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur lors de l'envoi de l'email";
      toast({
        title: "Erreur",
        description: msg,
        variant: "destructive",
      });
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
        </div>

        <div className="glass rounded-xl sm:rounded-2xl p-5 sm:p-8 shadow-dream text-center">
          {status === "loading" && (
            <>
              <Loader2 className="h-12 w-12 mx-auto mb-4 text-primary animate-spin" />
              <h1 className="text-xl sm:text-2xl font-display font-bold mb-2">
                Vérification en cours...
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground">{message}</p>
            </>
          )}

          {status === "pending" && (
            <>
              <Mail className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h1 className="text-xl sm:text-2xl font-display font-bold mb-2">Vérifiez votre boîte mail</h1>
              <p className="text-sm sm:text-base text-muted-foreground mb-4 text-pretty">{message}</p>
              <p className="text-xs text-muted-foreground mb-6 text-left rounded-lg border border-border bg-muted/40 p-3 text-pretty">
                Si aucun mail n’arrive après plusieurs minutes : vérifiez le dossier spam, puis dans le tableau Supabase → Authentication → Users que votre compte existe.
                Pour une livraison fiable en production, configurez un SMTP personnalisé (Réglages du projet → Authentication → SMTP).
              </p>
              <div className="space-y-2">
                <Button
                  type="button"
                  onClick={handleResendEmail}
                  className="w-full gradient-primary text-primary-foreground shadow-dream"
                >
                  Renvoyer l&apos;email de confirmation
                </Button>
                <Button type="button" onClick={() => navigate("/auth")} variant="outline" className="w-full">
                  Retour à la connexion
                </Button>
              </div>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <h1 className="text-xl sm:text-2xl font-display font-bold mb-2 text-green-600 dark:text-green-400">
                Email vérifié !
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground mb-6">{message}</p>
              <Button
                onClick={() => navigate("/auth")}
                className="w-full gradient-primary text-primary-foreground shadow-dream"
              >
                Se connecter
              </Button>
            </>
          )}

          {status === "error" && (
            <>
              <XCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
              <h1 className="text-xl sm:text-2xl font-display font-bold mb-2 text-destructive">
                Erreur de vérification
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground mb-4">{message}</p>
              
              {/* Mode debug : afficher les paramètres de l'URL */}
              {process.env.NODE_ENV === "development" && (
                <div className="mb-4 p-3 bg-muted rounded-lg text-left">
                  <p className="text-xs font-mono text-muted-foreground mb-2">Debug (dev uniquement):</p>
                  <p className="text-xs font-mono break-all">
                    URL: {window.location.href}<br />
                    Hash: {window.location.hash || "(vide)"}<br />
                    Search: {window.location.search || "(vide)"}
                  </p>
                </div>
              )}
              
              <div className="space-y-2">
                <Button
                  onClick={handleResendEmail}
                  variant="outline"
                  className="w-full"
                >
                  Renvoyer l'email de vérification
                </Button>
                <Button
                  onClick={() => navigate("/auth")}
                  className="w-full gradient-primary text-primary-foreground shadow-dream"
                >
                  Retour à la connexion
                </Button>
                <Button
                  onClick={() => navigate("/auth?tab=signup")}
                  variant="outline"
                  className="w-full"
                >
                  Créer un nouveau compte
                </Button>
              </div>
            </>
          )}

          {status === "expired" && (
            <>
              <Mail className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h1 className="text-xl sm:text-2xl font-display font-bold mb-2">
                Lien expiré
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground mb-6">{message}</p>
              <div className="space-y-2">
                <Button
                  onClick={handleResendEmail}
                  className="w-full gradient-primary text-primary-foreground shadow-dream"
                >
                  Renvoyer l'email de vérification
                </Button>
                <Button
                  onClick={() => navigate("/auth")}
                  variant="outline"
                  className="w-full"
                >
                  Retour à la connexion
                </Button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
