// Edge Function: génération d'image via Nebius (sans dépendance supabase-js)
// Secret requis : NEBIUS_API_KEY (Supabase → Edge Functions → Secrets)

const NEBIUS_BASE = "https://api.tokenfactory.nebius.com/v1";
const BUCKET = "dreamweave";
// Modèle image Nebius (si 404 "model not found", voir la liste : GET https://api.tokenfactory.nebius.com/v1/models avec ta clé API)
const MODEL = "black-forest-labs/flux-schnell";

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

    const defaultStyle = "Anime, Webtoon, dessin. ";
    const userStyleText = style_template?.trim() ?? "";
    const type_ = asset_type ?? "character";

    const typeInstructions: Record<string, string> = {
      character:
        "Personnage en PNG, fond transparent. Le personnage doit être entièrement visible de la tête aux pieds. Vue de FACE. Uniquement le personnage, pas de décor ni d'autres éléments. Pas de fond.",
      background:
        "Décor uniquement : environnement, lieu, paysage ou intérieur. Aucun personnage visible. Uniquement le décor.",
      object:
        "Objet seul en PNG, fond transparent. Uniquement l'objet, pas de personnage ni décor. Pas de fond.",
    };

    const viewInstructions: Record<string, string> = {
      profile_left:
        "Même personnage, vue de PROFIL GAUCHE (côté gauche du personnage visible). Entier de la tête aux pieds. PNG fond transparent. Uniquement le personnage.",
      profile_right:
        "Même personnage, vue de PROFIL DROITE (côté droit du personnage visible). Entier de la tête aux pieds. PNG fond transparent. Uniquement le personnage.",
      back: "Même personnage, vue de DOS. Entier de la tête aux pieds. PNG fond transparent. Uniquement le personnage.",
    };

    const parts: string[] = [defaultStyle, typeInstructions[type_] ?? typeInstructions.character];
    if (type_ === "character" && image_view && image_view !== "front" && viewInstructions[image_view]) {
      parts.push(viewInstructions[image_view]);
    }
    if (hasStyleText) {
      parts.push(`Style obligatoire à respecter : ${userStyleText}.`);
    }
    if (hasStyleImages) {
      parts.push(
        "Des images de référence définissent le STYLE visuel à utiliser (trait du dessin, palette de couleurs, ambiance, rendu). " +
          "Tu dois UNIQUEMENT t'inspirer de ce STYLE : extraire et appliquer le style (façon de dessiner, couleurs, lumière), sans copier le contenu, les personnages ou la composition des références. " +
          "Génère une image NOUVELLE qui correspond à la description ci-dessous, mais dessinée dans ce même style."
      );
    }
    parts.push("\n\nDescription de l'asset : ");
    const stylePrefix = parts.join(" ");
    const fullPrompt = stylePrefix + prompt.trim();
    console.log("[generate-asset-image] asset_id:", asset_id, "asset_type:", type_, "image_view:", image_view ?? "front");

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
