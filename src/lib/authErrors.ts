import type { Session, User } from "@supabase/supabase-js";

export type AuthErrorCode =
  | "USER_ALREADY_EXISTS"
  | "EMAIL_CONFIRMATION_REQUIRED"
  | "EMAIL_NOT_CONFIRMED";

export type AuthErrorWithMeta = Error & {
  code?: string | number;
  status?: number;
  user?: User;
  name?: string;
};

export type SignUpResultData = {
  user: User | null;
  session: Session | null;
};

// Supabase peut signaler user_already_exists de plusieurs manières :
// error.status (422), error.message, ou le header x-sb-error-code.
export function classifySignUpError(error: Error | null, data: SignUpResultData): Error | null {
  if (error) {
    const authError = error as AuthErrorWithMeta;
    const errorCode = authError.code ?? authError.status;
    const errorStatus = authError.status;
    const errorMessage = (error.message || "").toLowerCase();

    const is422Error = errorStatus === 422 || errorCode === 422;

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
      const customError = new Error(
        "Cet email est déjà utilisé. Connectez-vous ou utilisez un autre email."
      ) as AuthErrorWithMeta;
      customError.code = "USER_ALREADY_EXISTS" satisfies AuthErrorCode;
      customError.status = 422;
      return customError;
    }
    return error;
  }

  if (!data.user) {
    return new Error("Erreur lors de la création du compte. Veuillez réessayer.");
  }

  // Anti-énumération Supabase : email déjà enregistré → pas d'erreur HTTP,
  // mais identities = [] et aucun mail de confirmation n'est envoyé.
  // Ne pas utiliser identities ?? [] : si le champ est absent, ce n'est pas un doublon.
  // https://github.com/supabase/auth-js/issues/513
  const identitiesList = data.user.identities;
  if (!data.session && Array.isArray(identitiesList) && identitiesList.length === 0) {
    const customError = new Error(
      "Cet email est déjà utilisé : Supabase ne renvoie pas d’erreur et n’envoie aucun nouveau mail dans ce cas. Connectez-vous ou utilisez « Mot de passe oublié »."
    ) as AuthErrorWithMeta;
    customError.code = "USER_ALREADY_EXISTS" satisfies AuthErrorCode;
    customError.status = 422;
    return customError;
  }

  // data.session est null si l'email doit être confirmé
  if (!data.session && data.user) {
    const customError = new Error(
      "Un email de vérification a été envoyé. Veuillez vérifier votre boîte de réception."
    ) as AuthErrorWithMeta;
    customError.code = "EMAIL_CONFIRMATION_REQUIRED" satisfies AuthErrorCode;
    customError.user = data.user;
    return customError;
  }

  return null;
}

// Supabase peut signaler invalid_credentials de plusieurs manières :
// error.status (400), error.message, ou le header x-sb-error-code.
export function classifySignInError(error: Error): Error {
  const authError = error as AuthErrorWithMeta;
  const errorCode = authError.code ?? authError.status;
  const errorStatus = authError.status;
  const errorMessage = (error.message || "").toLowerCase();

  const is400Error = errorStatus === 400 || errorCode === 400;

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
    return new Error("Email ou mot de passe incorrect. Vérifiez vos identifiants et réessayez.");
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
    return customError;
  }

  return error;
}
