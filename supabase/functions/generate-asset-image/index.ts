// Edge Function: génération d'image via Nebius (sans dépendance supabase-js)
// Secret requis : NEBIUS_API_KEY (Supabase → Edge Functions → Secrets)

const NEBIUS_BASE = "https://api.tokenfactory.nebius.com/v1";
const BUCKET = "dreamweave";
// Modèle image Nebius (si 404 "model not found", voir la liste : GET https://api.tokenfactory.nebius.com/v1/models avec ta clé API)
const MODEL = "black-forest-labs/flux-schnell";
// Sécurité : la doc Nebius limite le prompt à ~2000 caractères
// On garde une marge pour éviter les erreurs de dépassement.
const MAX_PROMPT_CHARS = 1900;

// Prompts système centralisés (à modifier dans system-prompts/* pour changer le comportement global)
import {
  CHARACTER_BASE_PROMPT,
  CHARACTER_STYLE_TEXT_INSTRUCTION,
  CHARACTER_STYLE_IMAGES_INSTRUCTION,
  CHARACTER_VIEW_PROMPTS,
} from "./system-prompts/characters.ts";
import {
  BACKGROUND_BASE_PROMPT,
  BACKGROUND_STYLE_TEXT_INSTRUCTION,
  BACKGROUND_STYLE_IMAGES_INSTRUCTION,
} from "./system-prompts/backgrounds.ts";
import {
  OBJECT_BASE_PROMPT,
  OBJECT_STYLE_TEXT_INSTRUCTION,
  OBJECT_STYLE_IMAGES_INSTRUCTION,
} from "./system-prompts/objects.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: object, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getSubFromJwt(authHeader: string): string | null {
  try {
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) return null;
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  console.log("[generate-asset-image] requête reçue, method:", req.method);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("[generate-asset-image] 1. Vérification NEBIUS_API_KEY");
    const apiKey = Deno.env.get("NEBIUS_API_KEY");
    if (!apiKey) {
      console.log("[generate-asset-image] NEBIUS_API_KEY absente");
      return jsonResponse(
        { error: "NEBIUS_API_KEY non configurée. Supabase → Edge Functions → Secrets." },
        500
      );
    }

    console.log("[generate-asset-image] 2. Vérification Authorization");
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.log("[generate-asset-image] Authorization manquante");
      return jsonResponse({ error: "Authorization manquante" }, 401);
    }

    const userId = getSubFromJwt(authHeader);
    if (!userId) {
      console.log("[generate-asset-image] JWT invalide (sub manquant)");
      return jsonResponse({ error: "JWT invalide ou expiré" }, 401);
    }
    console.log("[generate-asset-image] userId:", userId);

    console.log("[generate-asset-image] 3. Parse body JSON");
    let body: {
      asset_id?: string;
      prompt?: string;
      style_template?: string;
      style_image_urls?: string[];
      asset_type?: "character" | "background" | "object";
      image_view?: "front" | "profile_left" | "profile_right" | "back";
    };
    try {
      body = (await req.json()) as typeof body;
    } catch (parseErr) {
      console.log("[generate-asset-image] Body JSON invalide:", parseErr);
      return jsonResponse({ error: "Body JSON invalide" }, 400);
    }

    const { asset_id, prompt, style_template, style_image_urls, asset_type, image_view } = body;
    if (!asset_id || !prompt?.trim()) {
      console.log("[generate-asset-image] asset_id ou prompt manquant");
      return jsonResponse({ error: "asset_id et prompt requis" }, 400);
    }

    const hasStyleText = !!style_template?.trim();
    const hasStyleImages = Array.isArray(style_image_urls) && style_image_urls.length > 0;
    if (!hasStyleText && !hasStyleImages) {
      console.log("[generate-asset-image] Aucun style défini (ni texte ni images)");
      return jsonResponse(
        {
          error: "Style requis",
          details:
            "Définissez un style dans l’onglet Style du projet : remplissez le champ « Template de style » et/ou ajoutez des images de référence, puis réessayez.",
        },
        400
      );
    }

    const userStyleText = style_template?.trim() ?? "";
    const type_ = asset_type ?? "character";

    const parts: string[] = [];
    // 1) Instructions de base par type (centralisées dans system-prompts)
    if (type_ === "character") {
      // Style principal = texte utilisateur (obligatoire) + prompt de base personnage
      if (hasStyleText) {
        parts.push(userStyleText.trim() + ", ");
      }
      parts.push(CHARACTER_BASE_PROMPT);
      if (image_view && image_view !== "front") {
        const viewKey = image_view as keyof typeof CHARACTER_VIEW_PROMPTS;
        const viewText = CHARACTER_VIEW_PROMPTS[viewKey];
        if (viewText) {
          parts.push(viewText);
        }
      }
    } else if (type_ === "background") {
      parts.push(BACKGROUND_BASE_PROMPT);
    } else if (type_ === "object") {
      parts.push(OBJECT_BASE_PROMPT);
    } else {
      // Type inconnu : on ne force aucun style par défaut
      parts.push(" ");
    }

    // 2) Texte de style (si défini)
    if (hasStyleText) {
      if (type_ === "character") {
        parts.push(CHARACTER_STYLE_TEXT_INSTRUCTION(userStyleText));
      } else if (type_ === "background") {
        parts.push(BACKGROUND_STYLE_TEXT_INSTRUCTION(userStyleText));
      } else if (type_ === "object") {
        parts.push(OBJECT_STYLE_TEXT_INSTRUCTION(userStyleText));
      }
    }

    // 3) Images de style (si présentes)
    if (hasStyleImages) {
      if (type_ === "character") {
        parts.push(CHARACTER_STYLE_IMAGES_INSTRUCTION);
      } else if (type_ === "background") {
        parts.push(BACKGROUND_STYLE_IMAGES_INSTRUCTION);
      } else if (type_ === "object") {
        parts.push(OBJECT_STYLE_IMAGES_INSTRUCTION);
      }
    }

    // Log détaillé du système de prompt utilisé (pour debug)
    console.log("[generate-asset-image] system_prompt_parts", {
      type: type_,
      image_view: image_view ?? "front",
      hasStyleText,
      hasStyleImages,
      styleText: userStyleText?.slice(0, 300) ?? "",
      partsPreview: parts.map((p) => p.slice(0, 120)),
    });

    // IMPORTANT : on donne la priorité absolue au prompt de l'utilisateur.
    // On place donc sa description en premier, puis les contraintes système et de style.
    const systemPrompt = parts.join(" ");
    let fullPrompt = `${prompt.trim()}\n\n${systemPrompt}`;

    if (fullPrompt.length > MAX_PROMPT_CHARS) {
      console.log(
        "[generate-asset-image] Prompt trop long, truncation",
        "len=",
        fullPrompt.length,
        "max=",
        MAX_PROMPT_CHARS
      );
      fullPrompt = fullPrompt.slice(0, MAX_PROMPT_CHARS);
    }

    console.log(
      "[generate-asset-image] asset_id:",
      asset_id,
      "asset_type:",
      type_,
      "image_view:",
      image_view ?? "front",
      "prompt_len=",
      fullPrompt.length
    );

    console.log("[generate-asset-image] 4. Env Supabase");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      console.log("[generate-asset-image] SUPABASE_URL ou SERVICE_ROLE_KEY manquant");
      return jsonResponse({ error: "Config Supabase manquante" }, 500);
    }

    console.log("[generate-asset-image] 5. Fetch asset en BDD");
    const assetRes = await fetch(
      `${supabaseUrl}/rest/v1/assets?id=eq.${asset_id}&select=id,user_id`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
        },
      }
    );
    if (!assetRes.ok) {
      const errT = await assetRes.text();
      console.log("[generate-asset-image] Erreur fetch asset:", assetRes.status, errT);
      return jsonResponse({ error: "Erreur lecture asset", details: errT.slice(0, 200) }, 502);
    }
    const assets = (await assetRes.json()) as { id: string; user_id: string }[];
    const asset = assets?.[0];
    if (!asset || asset.user_id !== userId) {
      console.log("[generate-asset-image] Asset introuvable ou user_id différent");
      return jsonResponse({ error: "Asset introuvable ou accès refusé" }, 403);
    }
    console.log("[generate-asset-image] 6. Appel API Nebius");
    const nebiusRes = await fetch(`${NEBIUS_BASE}/images/generations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        prompt: fullPrompt,
        n: 1,
        response_format: "b64_json",
        width: 512,
        height: 512,
      }),
    });

    const nebiusText = await nebiusRes.text();
    if (!nebiusRes.ok) {
      console.log("[generate-asset-image] Nebius erreur:", nebiusRes.status, nebiusText.slice(0, 300));
      return jsonResponse(
        { error: "Échec génération image", details: nebiusText.slice(0, 300) },
        502
      );
    }
    console.log("[generate-asset-image] 7. Parse réponse Nebius, upload Storage");
    let nebiusJson: { data?: { b64_json?: string }[] };
    try {
      nebiusJson = JSON.parse(nebiusText) as { data?: { b64_json?: string }[] };
    } catch {
      return jsonResponse({ error: "Réponse Nebius invalide" }, 502);
    }

    const b64 = nebiusJson.data?.[0]?.b64_json;
    if (!b64) {
      return jsonResponse({ error: "Réponse Nebius sans image" }, 502);
    }

    const binary = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const pathSuffix = image_view && image_view !== "front" ? `_${image_view}` : "";
    const path = `${asset.user_id}/assets/${asset_id}${pathSuffix}.png`;

    const form = new FormData();
    form.append("file", new Blob([binary], { type: "image/png" }), "image.png");

    const uploadRes = await fetch(`${supabaseUrl}/storage/v1/object/${BUCKET}/${path}`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "x-upsert": "true",
      },
      body: form,
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      console.log("[generate-asset-image] Erreur upload Storage:", uploadRes.status, errText);
      return jsonResponse(
        { error: "Échec upload image", details: errText.slice(0, 200) },
        502
      );
    }
    const imageUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${path}`;

    const updateField =
      image_view === "profile_left"
        ? "image_url_profile_left"
        : image_view === "profile_right"
          ? "image_url_profile_right"
          : image_view === "back"
            ? "image_url_back"
            : "image_url";
    const updatePayload = { [updateField]: imageUrl };

    console.log("[generate-asset-image] 8. Mise à jour BDD", updateField);
    const updateRes = await fetch(`${supabaseUrl}/rest/v1/assets?id=eq.${asset_id}`, {
      method: "PATCH",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(updatePayload),
    });

    if (!updateRes.ok) {
      const errT = await updateRes.text();
      console.log("[generate-asset-image] Erreur PATCH assets:", updateRes.status, errT);
      return jsonResponse(
        { error: "Image générée mais mise à jour BDD échouée", details: errT.slice(0, 200) },
        502
      );
    }
    console.log("[generate-asset-image] OK,", updateField, ":", imageUrl);
    return jsonResponse({ image_url: imageUrl, image_view: image_view ?? "front", update_field: updateField }, 200);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const stack = e instanceof Error ? e.stack : "";
    console.error("[generate-asset-image] Exception:", msg, stack);
    return jsonResponse(
      { error: "Erreur serveur", details: msg },
      500
    );
  }
});
