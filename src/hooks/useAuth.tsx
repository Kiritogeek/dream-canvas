/* eslint-disable react-refresh/only-export-components -- Provider + hook dans un seul module (pattern Auth classique). */
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { classifySignInError, classifySignUpError } from "@/lib/authErrors";
import type { User, Session } from "@supabase/supabase-js";

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

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

    if (import.meta.env.DEV) {
      console.debug("[DreamWeave Auth] signUp réponse", {
        erreur: error?.message,
        session: !!data.session,
        identities: data.user?.identities,
        email: data.user?.email,
      });
    }
    const classified = classifySignUpError(error, data);
    if (classified) throw classified;
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
      throw classifySignInError(error);
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
