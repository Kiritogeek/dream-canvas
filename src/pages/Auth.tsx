import { useState, useMemo } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, Mail, Lock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/ThemeToggle";

type AuthUiError = Error & {
  code?: string | number;
  status?: number;
};

function getErrorCode(err: Error): string | number | undefined {
  return (err as AuthUiError).code;
}

function getErrorStatus(err: Error): number | undefined {
  return (err as AuthUiError).status;
}

// Regex plus strict pour validation email : format valide avec domaine valide
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
const MIN_PASSWORD_LENGTH = 6;
const MIN_DISPLAY_NAME_LENGTH = 2;

/**
 * Valide le format d'un email de manière stricte
 * Vérifie que l'email a un format valide et un domaine valide
 */
function isValidEmail(email: string): boolean {
  if (!email || !email.trim()) return false;
  const trimmedEmail = email.trim().toLowerCase();
  
  // Vérification basique du format
  if (!EMAIL_REGEX.test(trimmedEmail)) return false;
  
  // Vérification que le domaine existe et est valide
  const parts = trimmedEmail.split('@');
  if (parts.length !== 2) return false;
  
  const [localPart, domain] = parts;
  
  // La partie locale ne doit pas être vide
  if (!localPart || localPart.length === 0) return false;
  
  // Le domaine doit avoir au moins un point et un TLD
  if (!domain || domain.length === 0) return false;
  const domainParts = domain.split('.');
  if (domainParts.length < 2) return false;
  
  // Le TLD doit avoir au moins 2 caractères
  const tld = domainParts[domainParts.length - 1];
  if (!tld || tld.length < 2) return false;
  
  // Vérification que le domaine ne commence ou ne se termine pas par un point ou un tiret
  if (domain.startsWith('.') || domain.startsWith('-') || 
      domain.endsWith('.') || domain.endsWith('-')) return false;
  
  return true;
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export default function Auth() {
  const [searchParams] = useSearchParams();
  const [isSignUp, setIsSignUp] = useState(searchParams.get("tab") === "signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [triedSubmit, setTriedSubmit] = useState(false);
  const { signIn, signUp, signInWithGoogle, resetPassword } = useAuth();
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const errors = useMemo(() => {
    const e: { email?: string; password?: string; confirmPassword?: string; displayName?: string } = {};
    const trimmedEmail = email.trim();
    
    // Validation email stricte
    if (!trimmedEmail) {
      e.email = "L'email est requis";
    } else if (!isValidEmail(trimmedEmail)) {
      e.email = "Veuillez saisir une adresse email valide (ex: nom@domaine.com)";
    }
    
    // Validation mot de passe
    if (!password) {
      e.password = "Le mot de passe est requis";
    } else if (password.length < MIN_PASSWORD_LENGTH) {
      e.password = `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères`;
    }
    
    // Validation confirmation mot de passe (inscription uniquement)
    if (isSignUp) {
      if (!confirmPassword) {
        e.confirmPassword = "La confirmation du mot de passe est requise";
      } else if (password !== confirmPassword) {
        e.confirmPassword = "Les mots de passe ne correspondent pas";
      }
      
      // Validation nom d'affichage
      const trimmedDisplayName = displayName.trim();
      if (!trimmedDisplayName) {
        e.displayName = "Le nom d'affichage est requis";
      } else if (trimmedDisplayName.length < MIN_DISPLAY_NAME_LENGTH) {
        e.displayName = `Le nom d'affichage doit contenir au moins ${MIN_DISPLAY_NAME_LENGTH} caractères`;
      }
    }
    
    return e;
  }, [email, password, confirmPassword, displayName, isSignUp]);

  const isValid = useMemo(() => Object.keys(errors).length === 0, [errors]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
      toast({
        title: "Redirection…",
        description: "Vous allez être redirigé vers Google.",
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Connexion Google impossible";
      toast({
        title: "Erreur",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTriedSubmit(true);
    
    // Validation stricte avant soumission
    const trimmedEmail = email.trim();
    if (!isValidEmail(trimmedEmail)) {
      toast({
        title: "Email invalide",
        description: "Veuillez saisir une adresse email valide pour continuer.",
        variant: "destructive",
      });
      return;
    }
    
    if (!isValid) {
      // Afficher les erreurs de validation
      const firstError = Object.values(errors)[0];
      if (firstError) {
        toast({
          title: "Formulaire invalide",
          description: firstError,
          variant: "destructive",
        });
      }
      return;
    }
    
    setLoading(true);
    try {
      // Normaliser l'email (minuscules, trim)
      const normalizedEmail = trimmedEmail.toLowerCase();
      
      if (isSignUp) {
        try {
          await signUp(normalizedEmail, password, displayName.trim());
          // Si on arrive ici, l'utilisateur est connecté (email confirmé ou confirmation désactivée)
          toast({
            title: "Compte créé !",
            description: "Bienvenue, vous êtes connecté.",
          });
          navigate("/dashboard");
        } catch (signUpError: unknown) {
          // Vérifier si c'est une erreur de confirmation d'email requise
          if (signUpError instanceof Error && getErrorCode(signUpError) === "EMAIL_CONFIRMATION_REQUIRED") {
            // Ne pas afficher d'erreur destructive, mais un message informatif
            toast({
              title: "Email de vérification envoyé",
              description: "Vérifiez votre boîte de réception et cliquez sur le lien pour confirmer votre email. Vous pourrez ensuite vous connecter.",
            });
            // Réinitialiser le formulaire
            setEmail("");
            setPassword("");
            setConfirmPassword("");
            setDisplayName("");
            setTriedSubmit(false);
            // Basculer vers le mode connexion après un délai
            setTimeout(() => {
              setIsSignUp(false);
              toast({
                title: "Mode connexion",
                description: "Une fois votre email confirmé, vous pourrez vous connecter ici.",
              });
            }, 3000);
            return; // Sortir de la fonction sans afficher d'erreur
          }
          // Sinon, propager l'erreur pour qu'elle soit gérée par le bloc catch général
          throw signUpError;
        }
      } else {
        await signIn(normalizedEmail, password);
        toast({
          title: "Connexion réussie",
          description: "Bienvenue !",
        });
        navigate("/dashboard");
      }
    } catch (err: unknown) {
      let errorMessage = "Une erreur est survenue";
      let shouldSwitchToSignIn = false;
      
      if (err instanceof Error) {
        // Vérifier le code d'erreur personnalisé
        const errorCode = getErrorCode(err);
        const errorStatus = getErrorStatus(err);
        const errorMsg = err.message.toLowerCase();
        
        // Détecter l'erreur user_already_exists (peut venir de plusieurs sources)
        const isUserExistsError = 
          errorCode === "USER_ALREADY_EXISTS" ||
          errorStatus === 422 ||
          errorMsg.includes("déjà utilisé") ||
          errorMsg.includes("already exists") ||
          errorMsg.includes("already registered");
        
        if (isUserExistsError) {
          errorMessage = "Cet email est déjà utilisé. Si vous avez déjà un compte, connectez-vous. Sinon, utilisez un autre email.";
          shouldSwitchToSignIn = true;
        } else if (
          errorCode === "invalid_credentials" ||
          errorMsg.includes("invalid login credentials") || 
          errorMsg.includes("invalid credentials") ||
          errorMsg.includes("email ou mot de passe incorrect") ||
          errorMsg.includes("vérifiez vos identifiants")
        ) {
          errorMessage = "Email ou mot de passe incorrect. Vérifiez vos identifiants et réessayez.";
          // Mettre en évidence les champs email et mot de passe
          setTriedSubmit(true);
        } else if (
          errorCode === "EMAIL_NOT_CONFIRMED" ||
          errorMsg.includes("email not confirmed") ||
          errorMsg.includes("email not verified") ||
          errorMsg.includes("veuillez confirmer votre email")
        ) {
          errorMessage = "Veuillez confirmer votre email avant de vous connecter. Vérifiez votre boîte de réception et cliquez sur le lien de vérification.";
          toast({
            title: "Email non vérifié",
            description: "Un email de vérification vous a été envoyé lors de l'inscription. Vérifiez votre boîte de réception.",
            variant: "default",
          });
        } else if (errorMsg.includes("email already registered") || errorMsg.includes("user already registered") || errorMsg.includes("user_already_exists")) {
          errorMessage = "Cet email est déjà utilisé. Basculement vers la connexion...";
          shouldSwitchToSignIn = true;
        } else if (errorMsg.includes("password")) {
          errorMessage = "Le mot de passe est incorrect";
        } else if (errorMsg.includes("email")) {
          errorMessage = "L'adresse email n'est pas valide";
        } else {
          errorMessage = err.message;
        }
      }
      
      toast({
        title: shouldSwitchToSignIn ? "Compte existant" : "Erreur",
        description: errorMessage,
        variant: shouldSwitchToSignIn ? "default" : "destructive",
      });
      
      // Basculer automatiquement vers la connexion si l'utilisateur existe déjà
      if (shouldSwitchToSignIn && isSignUp) {
        // Petit délai pour que l'utilisateur voie le message
        setTimeout(() => {
          setIsSignUp(false);
          setTriedSubmit(false);
          // Conserver l'email pour faciliter la connexion
          // Le mot de passe est réinitialisé pour sécurité
          setPassword("");
          toast({
            title: "Compte existant détecté",
            description: "Cet email est déjà utilisé. Connectez-vous ou utilisez « Mot de passe oublié » si vous ne vous souvenez pas de votre mot de passe.",
          });
        }, 2000);
      }
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
            {showForgotPassword && !isSignUp 
              ? "Mot de passe oublié" 
              : isSignUp 
                ? "Créer un compte" 
                : "Bon retour !"}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            {showForgotPassword && !isSignUp
              ? "Nous vous enverrons un lien pour réinitialiser votre mot de passe"
              : isSignUp 
                ? "Commencez à créer vos webtoons" 
                : "Connectez-vous pour continuer"}
          </p>
        </div>

        <div className="glass rounded-xl sm:rounded-2xl p-5 sm:p-8 shadow-dream">
          {/* Afficher le formulaire de réinitialisation OU le formulaire normal */}
          {showForgotPassword && !isSignUp ? (
            // Formulaire de réinitialisation de mot de passe
            <div className="space-y-4">
              <div className="text-center mb-4">
                <h2 className="text-lg sm:text-xl font-display font-bold mb-2">Réinitialiser le mot de passe</h2>
                <p className="text-sm text-muted-foreground">
                  Entrez votre email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
                </p>
              </div>
              
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="vous@exemple.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      autoComplete="email"
                    />
                  </div>
                </div>
                
                <Button
                  type="button"
                  className="w-full gradient-primary text-primary-foreground shadow-dream"
                  onClick={async () => {
                    if (!isValidEmail(email.trim())) {
                      toast({
                        title: "Email invalide",
                        description: "Veuillez saisir une adresse email valide.",
                        variant: "destructive",
                      });
                      return;
                    }
                    setLoading(true);
                    try {
                      await resetPassword(email.trim());
                      setResetEmailSent(true);
                      toast({
                        title: "Email envoyé",
                        description: "Vérifiez votre boîte de réception pour réinitialiser votre mot de passe.",
                      });
                    } catch (err: unknown) {
                      const msg = err instanceof Error ? err.message : "Erreur lors de l'envoi de l'email";
                      toast({
                        title: "Erreur",
                        description: msg,
                        variant: "destructive",
                      });
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading || !email.trim() || !isValidEmail(email.trim())}
                >
                  {loading ? "Envoi..." : "Envoyer l'email de réinitialisation"}
                </Button>
                
                {resetEmailSent && (
                  <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                    <p className="text-sm text-green-700 dark:text-green-400 text-center">
                      ✓ Email de réinitialisation envoyé ! Vérifiez votre boîte de réception.
                    </p>
                  </div>
                )}
                
                <div className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setShowForgotPassword(false);
                      setResetEmailSent(false);
                      setTriedSubmit(false);
                      setConfirmPassword(""); // Réinitialiser la confirmation
                    }}
                  >
                    Se connecter
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            // Formulaire normal (inscription ou connexion)
            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp && (
                <div className="space-y-2">
                  <Label htmlFor="name" className={triedSubmit && errors.displayName ? "text-destructive" : ""}>
                    Nom d'affichage
                  </Label>
                  <div className="relative">
                    <User className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${triedSubmit && errors.displayName ? "text-destructive" : "text-muted-foreground"}`} />
                    <Input
                      id="name"
                      placeholder="Votre pseudo"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className={`pl-10 ${triedSubmit && errors.displayName ? "border-destructive focus-visible:ring-destructive" : ""}`}
                    />
                  </div>
                  {triedSubmit && errors.displayName && (
                    <p className="text-sm text-destructive">{errors.displayName}</p>
                  )}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email" className={triedSubmit && errors.email ? "text-destructive" : ""}>
                  Email
                </Label>
                <div className="relative">
                  <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${triedSubmit && errors.email ? "text-destructive" : "text-muted-foreground"}`} />
                  <Input
                    id="email"
                    type="email"
                    placeholder="vous@exemple.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      // Réinitialiser triedSubmit si l'utilisateur corrige l'email
                      if (triedSubmit && errors.email) {
                        setTriedSubmit(false);
                      }
                    }}
                    onBlur={() => {
                      // Valider l'email quand l'utilisateur quitte le champ
                      if (email.trim() && !isValidEmail(email.trim())) {
                        setTriedSubmit(true);
                      }
                    }}
                    className={`pl-10 ${triedSubmit && errors.email ? "border-destructive focus-visible:ring-destructive" : ""}`}
                    autoComplete="email"
                  />
                </div>
                {triedSubmit && errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className={triedSubmit && errors.password ? "text-destructive" : ""}>
                  Mot de passe
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
                      // Réinitialiser triedSubmit si l'utilisateur corrige le mot de passe
                      if (triedSubmit && errors.password) {
                        setTriedSubmit(false);
                      }
                    }}
                    className={`pl-10 ${triedSubmit && errors.password ? "border-destructive focus-visible:ring-destructive" : ""}`}
                    autoComplete={isSignUp ? "new-password" : "current-password"}
                  />
                </div>
                {triedSubmit && errors.password && (
                  <p className="text-sm text-destructive">{errors.password}</p>
                )}
                {!isSignUp && (
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setShowForgotPassword(true);
                        setTriedSubmit(false);
                      }}
                      className="text-xs sm:text-sm text-primary hover:underline"
                    >
                      Mot de passe oublié ?
                    </button>
                  </div>
                )}
              </div>
              {isSignUp && (
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
                        // Réinitialiser triedSubmit si l'utilisateur corrige la confirmation
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
              )}
              <Button
                type="submit"
                className="w-full gradient-primary text-primary-foreground shadow-dream"
                disabled={loading || !isValid}
                title={!isValid ? "Veuillez remplir tous les champs correctement" : undefined}
              >
                {loading ? "Chargement..." : isSignUp ? "S'inscrire" : "Se connecter"}
              </Button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">ou</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full gap-2"
                disabled={loading}
                onClick={handleGoogleSignIn}
              >
                <GoogleIcon />
                Continuer avec Google
              </Button>
            </form>
          )}

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">
              {isSignUp ? "Déjà un compte ?" : "Pas encore de compte ?"}
            </span>{" "}
            <button
              type="button"
              onClick={() => {
                setTriedSubmit(false);
                setIsSignUp(!isSignUp);
                setConfirmPassword(""); // Réinitialiser la confirmation lors du changement
              }}
              className="text-primary font-medium hover:underline"
            >
              {isSignUp ? "Se connecter" : "S'inscrire"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
