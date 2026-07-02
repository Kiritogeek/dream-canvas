import { describe, it, expect } from "vitest";
import type { Session, User } from "@supabase/supabase-js";
import {
  classifySignUpError,
  classifySignInError,
  type AuthErrorWithMeta,
} from "@/lib/authErrors";

function fakeError(message: string, meta: { code?: string | number; status?: number; name?: string } = {}): Error {
  return Object.assign(new Error(message), meta);
}

function fakeUser(extra?: Record<string, unknown>): User {
  return { id: "u1", email: "test@exemple.com", ...extra } as unknown as User;
}

const fakeSession = { access_token: "token" } as unknown as Session;
const noData = { user: null, session: null };

function meta(err: Error | null): AuthErrorWithMeta {
  return err as AuthErrorWithMeta;
}

// ── classifySignUpError — erreur Supabase ─────────────────────────

describe("classifySignUpError — erreur Supabase", () => {
  const expectUserExists = (err: Error | null) => {
    expect(meta(err).code).toBe("USER_ALREADY_EXISTS");
    expect(meta(err).status).toBe(422);
    expect(err?.message).toBe("Cet email est déjà utilisé. Connectez-vous ou utilisez un autre email.");
  };

  it('code "user_already_exists" → USER_ALREADY_EXISTS', () => {
    expectUserExists(classifySignUpError(fakeError("duplicate", { code: "user_already_exists" }), noData));
  });

  it("status 422 seul → USER_ALREADY_EXISTS", () => {
    expectUserExists(classifySignUpError(fakeError("Unprocessable Entity", { status: 422 }), noData));
  });

  it("code numérique 422 → USER_ALREADY_EXISTS", () => {
    expectUserExists(classifySignUpError(fakeError("Unprocessable Entity", { code: 422 }), noData));
  });

  it('name "AuthApiError" + status 422 → USER_ALREADY_EXISTS', () => {
    expectUserExists(classifySignUpError(fakeError("signup error", { name: "AuthApiError", status: 422 }), noData));
  });

  it('message "already registered" sans status → USER_ALREADY_EXISTS', () => {
    expectUserExists(classifySignUpError(fakeError("This email is already registered"), noData));
  });

  it('message "already exists" → USER_ALREADY_EXISTS', () => {
    expectUserExists(classifySignUpError(fakeError("A user with this email already exists"), noData));
  });

  it('message "user_already_exists" → USER_ALREADY_EXISTS', () => {
    expectUserExists(classifySignUpError(fakeError("error code: user_already_exists"), noData));
  });

  it('message "email already in use" → USER_ALREADY_EXISTS', () => {
    expectUserExists(classifySignUpError(fakeError("email already in use"), noData));
  });

  it('message "user already registered" (format Supabase réel) → USER_ALREADY_EXISTS', () => {
    expectUserExists(classifySignUpError(fakeError("User already registered", { name: "AuthApiError", status: 400 }), noData));
  });

  it("message en majuscules → détecté (insensible à la casse)", () => {
    expectUserExists(classifySignUpError(fakeError("USER ALREADY REGISTERED"), noData));
  });

  it('422 + message contenant "email" → USER_ALREADY_EXISTS', () => {
    expectUserExists(classifySignUpError(fakeError("email rate limit exceeded", { status: 422 }), noData));
  });

  // Comportement actuel assumé (anti-régression) : TOUT 422 est traité comme
  // user_already_exists, y compris weak_password — voir bugsFound.
  it("422 weak_password → USER_ALREADY_EXISTS (comportement actuel documenté)", () => {
    expectUserExists(classifySignUpError(fakeError("Password should be at least 6 characters.", { name: "AuthApiError", status: 422, code: "weak_password" }), noData));
  });

  it("erreur inconnue (500) → retournée telle quelle (même instance)", () => {
    const err = fakeError("Database error saving new user", { status: 500 });
    expect(classifySignUpError(err, noData)).toBe(err);
  });

  it('name "AuthApiError" sans 422 ni message reconnu → retournée telle quelle', () => {
    const err = fakeError("Signups not allowed for this instance", { name: "AuthApiError", status: 500 });
    expect(classifySignUpError(err, noData)).toBe(err);
  });

  it("message vide sans code ni status → retournée telle quelle", () => {
    const err = fakeError("");
    expect(classifySignUpError(err, noData)).toBe(err);
  });
});

// ── classifySignUpError — réponse sans erreur ─────────────────────

describe("classifySignUpError — réponse sans erreur (anti-énumération)", () => {
  it("user null → erreur générique sans code", () => {
    const res = classifySignUpError(null, { user: null, session: null });
    expect(res?.message).toBe("Erreur lors de la création du compte. Veuillez réessayer.");
    expect(meta(res).code).toBeUndefined();
  });

  it("session null + identities [] → USER_ALREADY_EXISTS (doublon silencieux Supabase)", () => {
    const res = classifySignUpError(null, { user: fakeUser({ identities: [] }), session: null });
    expect(meta(res).code).toBe("USER_ALREADY_EXISTS");
    expect(meta(res).status).toBe(422);
    expect(res?.message).toContain("déjà utilisé");
  });

  it("session null + identities absent → EMAIL_CONFIRMATION_REQUIRED (absent ≠ doublon)", () => {
    const res = classifySignUpError(null, { user: fakeUser(), session: null });
    expect(meta(res).code).toBe("EMAIL_CONFIRMATION_REQUIRED");
  });

  it("session null + identities null → EMAIL_CONFIRMATION_REQUIRED (null ≠ doublon)", () => {
    const res = classifySignUpError(null, { user: fakeUser({ identities: null }), session: null });
    expect(meta(res).code).toBe("EMAIL_CONFIRMATION_REQUIRED");
  });

  it("session null + identities non-vide → EMAIL_CONFIRMATION_REQUIRED avec user attaché", () => {
    const user = fakeUser({ identities: [{ id: "i1", provider: "email" }] });
    const res = classifySignUpError(null, { user, session: null });
    expect(meta(res).code).toBe("EMAIL_CONFIRMATION_REQUIRED");
    expect(meta(res).user).toBe(user);
    expect(res?.message).toBe("Un email de vérification a été envoyé. Veuillez vérifier votre boîte de réception.");
  });

  it("session présente + user présent → null (succès, aucune erreur)", () => {
    expect(classifySignUpError(null, { user: fakeUser({ identities: [{ id: "i1" }] }), session: fakeSession })).toBeNull();
  });

  it("session présente + identities [] → null (le doublon ne vaut que sans session)", () => {
    expect(classifySignUpError(null, { user: fakeUser({ identities: [] }), session: fakeSession })).toBeNull();
  });
});

// ── classifySignInError — identifiants invalides ──────────────────

describe("classifySignInError — identifiants invalides", () => {
  const INVALID_MSG = "Email ou mot de passe incorrect. Vérifiez vos identifiants et réessayez.";

  const expectInvalidCredentials = (err: Error) => {
    expect(err.message).toBe(INVALID_MSG);
    expect(meta(err).code).toBeUndefined();
  };

  it('code "invalid_credentials" → message générique', () => {
    expectInvalidCredentials(classifySignInError(fakeError("some error", { code: "invalid_credentials" })));
  });

  it("format Supabase réel (AuthApiError 400 invalid_credentials) → message générique", () => {
    expectInvalidCredentials(classifySignInError(fakeError("Invalid login credentials", { name: "AuthApiError", status: 400, code: "invalid_credentials" })));
  });

  it('name "AuthApiError" + message contenant "invalid" → message générique', () => {
    expectInvalidCredentials(classifySignInError(fakeError("invalid grant", { name: "AuthApiError" })));
  });

  it('message "invalid login credentials" seul → message générique', () => {
    expectInvalidCredentials(classifySignInError(fakeError("Invalid login credentials")));
  });

  it('message "invalid credentials" → message générique', () => {
    expectInvalidCredentials(classifySignInError(fakeError("invalid credentials")));
  });

  it('message "email or password" → message générique', () => {
    expectInvalidCredentials(classifySignInError(fakeError("The email or password is incorrect")));
  });

  it('message "incorrect password" → message générique', () => {
    expectInvalidCredentials(classifySignInError(fakeError("incorrect password provided")));
  });

  it('message "wrong password" → message générique', () => {
    expectInvalidCredentials(classifySignInError(fakeError("wrong password")));
  });

  it('status 400 + message contenant "password" → message générique', () => {
    expectInvalidCredentials(classifySignInError(fakeError("password authentication failed", { status: 400 })));
  });

  it('status 400 + message contenant "credentials" → message générique', () => {
    expectInvalidCredentials(classifySignInError(fakeError("bad credentials", { status: 400 })));
  });

  it('code numérique 400 + message contenant "password" → message générique', () => {
    expectInvalidCredentials(classifySignInError(fakeError("password mismatch", { code: 400 })));
  });

  it("message en majuscules → détecté (insensible à la casse)", () => {
    expectInvalidCredentials(classifySignInError(fakeError("INVALID LOGIN CREDENTIALS")));
  });

  it("priorité aux identifiants invalides si le message matche aussi email not confirmed", () => {
    expectInvalidCredentials(classifySignInError(fakeError("invalid credentials: email not confirmed")));
  });
});

// ── classifySignInError — email non confirmé ──────────────────────

describe("classifySignInError — email non confirmé", () => {
  const expectEmailNotConfirmed = (err: Error) => {
    expect(meta(err).code).toBe("EMAIL_NOT_CONFIRMED");
    expect(err.message).toBe("Veuillez confirmer votre email avant de vous connecter. Vérifiez votre boîte de réception.");
  };

  it('message "Email not confirmed" → EMAIL_NOT_CONFIRMED', () => {
    expectEmailNotConfirmed(classifySignInError(fakeError("Email not confirmed")));
  });

  it("format Supabase réel (AuthApiError 400 email_not_confirmed) → EMAIL_NOT_CONFIRMED", () => {
    expectEmailNotConfirmed(classifySignInError(fakeError("Email not confirmed", { name: "AuthApiError", status: 400, code: "email_not_confirmed" })));
  });

  it('message "email_not_confirmed" → EMAIL_NOT_CONFIRMED', () => {
    expectEmailNotConfirmed(classifySignInError(fakeError("error code: email_not_confirmed")));
  });

  it('message "email not verified" → EMAIL_NOT_CONFIRMED', () => {
    expectEmailNotConfirmed(classifySignInError(fakeError("Your email not verified yet")));
  });

  it('code "email_not_confirmed" sans message reconnu → EMAIL_NOT_CONFIRMED', () => {
    expectEmailNotConfirmed(classifySignInError(fakeError("some auth issue", { code: "email_not_confirmed" })));
  });
});

// ── classifySignInError — fallback ────────────────────────────────

describe("classifySignInError — fallback erreur inconnue", () => {
  it("erreur inconnue (429) → même instance retournée", () => {
    const err = fakeError("Too many requests", { status: 429 });
    expect(classifySignInError(err)).toBe(err);
  });

  it('status 400 sans mention password/credentials → même instance', () => {
    const err = fakeError("Bad request body", { status: 400 });
    expect(classifySignInError(err)).toBe(err);
  });

  it("message vide sans code → même instance", () => {
    const err = fakeError("");
    expect(classifySignInError(err)).toBe(err);
  });
});
