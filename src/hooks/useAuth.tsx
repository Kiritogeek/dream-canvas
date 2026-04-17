import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

type AuthErrorCode =
  | "USER_ALREADY_EXISTS"
  | "EMAIL_CONFIRMATION_REQUIRED"
  | "EMAIL_NOT_CONFIRMED";

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

type AuthErrorWithMeta = Error & {
  code?: string | number;
  status?: number;
  user?: User;
  name?: string;
};

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session && (window.location.search.includes("code=") || window.location.hash)) {
        window.history.replaceState(null, "", window.location.pathname);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, displayName?: string) => {
    // Validation supplémentaire côté hook
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail || !EMAIL_REGEX.test(trimmedEmail)) {
      throw new Error("L'adresse email n'est pas valide");
    }

    const { data, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/verify-email`,
        data: { display_name: displayName },
      },
    });
    
    if (error) {
      // Détecter l'erreur user_already_exists (code d'erreur Supabase)
      // Supabase peut retourner cette erreur de différentes manières :
      // - Dans error.status (422)
      // - Dans error.message
      // - Dans les headers HTTP (x-sb-error-code: user_already_exists)
      const authError = error as AuthErrorWithMeta;
      const errorCode = authError.code ?? authError.status;
      const errorStatus = authError.status;
      const errorMessage = (error.message || "").toLowerCase();
      
      // Vérifier si c'est une erreur 422 (Unprocessable Entity) qui indique souvent user_already_exists
      // Le header x-sb-error-code contient "user_already_exists" pour cette erreur
      const is422Error = errorStatus === 422 || errorCode === 422;
      
      // Vérifier les différents formats de message d'erreur et codes
      // Note: Supabase retourne souvent error.status = 422 avec le header x-sb-error-code: user_already_exists
      const isUserExistsError = 
        errorCode === "user_already_exists" ||
        authError.name === "AuthApiError" && is422Error ||
        errorMessage.includes("already registered") ||
        errorMessage.includes("already exists") ||
        errorMessage.includes("user_already_exists") ||
        errorMessage.includes("email already in use") ||
        errorMessage.includes("user already registered") ||
        (is422Error && (errorMessage.includes("user") || errorMessage.includes("email")));
      
      if (isUserExistsError || is422Error) {
        // Créer une erreur personnalisée avec un flag pour indiquer qu'on peut basculer vers la connexion
        const customError = new Error(
          "Cet email est déjà utilisé. Connectez-vous ou utilisez un autre email."
        ) as AuthErrorWithMeta;
        customError.code = "USER_ALREADY_EXISTS" satisfies AuthErrorCode;
        customError.status = 422;
        throw customError;
      }
      throw error;
    }
    
    // Vérifier que l'utilisateur a bien été créé
    if (!data.user) {
      throw new Error("Erreur lors de la création du compte. Veuillez réessayer.");
    }
    
    // Si l'email n'est pas confirmé, retourner une information spéciale
    // data.session sera null si l'email doit être confirmé
    if (!data.session && data.user) {
      const customError = new Error(
        "Un email de vérification a été envoyé. Veuillez vérifier votre boîte de réception."
      ) as AuthErrorWithMeta;
      customError.code = "EMAIL_CONFIRMATION_REQUIRED" satisfies AuthErrorCode;
      customError.user = data.user;
      throw customError;
    }
  };

  const signIn = async (email: string, password: string) => {
    // Validation supplémentaire côté hook
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail || !EMAIL_REGEX.test(trimmedEmail)) {
      throw new Error("L'adresse email n'est pas valide");
    }

    const { data, error } = await supabase.auth.signInWithPassword({ 
      email: trimmedEmail, 
      password 
    });
    
    if (error) {
      // Détecter l'erreur invalid_credentials (code d'erreur Supabase)
      // Supabase peut retourner cette erreur de différentes manières :
      // - Dans error.status (400)
      // - Dans error.message
      // - Dans les headers HTTP (x-sb-error-code: invalid_credentials)
      const authError = error as AuthErrorWithMeta;
      const errorCode = authError.code ?? authError.status;
      const errorStatus = authError.status;
      const errorMessage = (error.message || "").toLowerCase();
      
      // Vérifier si c'est une erreur 400 (Bad Request) qui peut indiquer invalid_credentials
      const is400Error = errorStatus === 400 || errorCode === 400;
      
      // Vérifier les différents formats de message d'erreur et codes
      const isInvalidCredentials = 
        errorCode === "invalid_credentials" ||
        authError.name === "AuthApiError" && errorMessage.includes("invalid") ||
        errorMessage.includes("invalid login credentials") ||
        errorMessage.includes("invalid credentials") ||
        errorMessage.includes("email or password") ||
        errorMessage.includes("incorrect password") ||
        errorMessage.includes("wrong password") ||
        (is400Error && (errorMessage.includes("password") || errorMessage.includes("credentials")));
      
      if (isInvalidCredentials) {
        throw new Error("Email ou mot de passe incorrect. Vérifiez vos identifiants et réessayez.");
      }
      
      if (
        errorMessage.includes("email not confirmed") || 
        errorMessage.includes("email_not_confirmed") ||
        errorMessage.includes("email not verified") ||
        errorCode === "email_not_confirmed"
      ) {
        const customError = new Error(
          "Veuillez confirmer votre email avant de vous connecter. Vérifiez votre boîte de réception."
        ) as AuthErrorWithMeta;
        customError.code = "EMAIL_NOT_CONFIRMED" satisfies AuthErrorCode;
        throw customError;
      }
      
      throw error;
    }
    
    // Vérifier que la session a bien été créée
    if (!data.session || !data.user) {
      throw new Error("Erreur lors de la connexion. Veuillez réessayer.");
    }
  };

  const signInWithGoogle = async () => {
    // Nettoyer la session locale avant OAuth pour éviter l'utilisation d'un refresh token obsolète.
    await supabase.auth.signOut({ scope: "local" });
    Object.keys(localStorage)
      .filter((key) => key.startsWith("sb-") && key.endsWith("-auth-token"))
      .forEach((key) => localStorage.removeItem(key));

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });
    if (error) throw error;
  };

  const resetPassword = async (email: string) => {
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail || !EMAIL_REGEX.test(trimmedEmail)) {
      throw new Error("L'adresse email n'est pas valide");
    }

    const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    
    if (error) {
      if (error.message.includes("not found") || error.message.includes("does not exist")) {
        throw new Error("Aucun compte n'est associé à cet email.");
      }
      throw error;
    }
  };

  const updatePassword = async (newPassword: string) => {
    if (!newPassword || newPassword.length < 6) {
      throw new Error("Le mot de passe doit contenir au moins 6 caractères");
    }
    
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    
    if (error) {
      throw error;
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signInWithGoogle, resetPassword, updatePassword, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
