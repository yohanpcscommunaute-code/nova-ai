
export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    const json = (data, status = 200) =>
      new Response(JSON.stringify(data), {
        status,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json; charset=utf-8",
        },
      });

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      return json({ ok: true, service: "NOVA AI API" });
    }

    if (url.pathname !== "/api/generate" || request.method !== "POST") {
      return json({ error: "Route introuvable" }, 404);
    }

    if (!env.AI) {
      return json({
        error: "Workers AI n'est pas encore connecté.",
      }, 503);
    }

    try {
      const body = await request.json();
      const prompt = String(body.prompt || "").trim();
      const mode = body.mode === "site" ? "site" : "chat";

      if (!prompt || prompt.length > 6000) {
        return json({
          error: "Le texte doit contenir entre 1 et 6000 caractères.",
        }, 400);
      }

      const instruction =
        mode === "site"
          ? "Tu es NOVA AI, un développeur web expert. Génère un site complet en HTML avec CSS intégré. Réponds uniquement avec le code HTML, sans Markdown. N'inclus aucun script externe, aucune clé secrète et aucune requête vers un serveur externe."
          : "Tu es NOVA AI, un assistant utile qui répond clairement en français.";

      const result = await env.AI.run(
        "@cf/meta/llama-3.1-8b-instruct",
        {
          messages: [
            { role: "system", content: instruction },
            { role: "user", content: prompt },
          ],
          max_tokens: mode === "site" ? 3000 : 1000,
        }
      );

      return json({
        ok: true,
        mode,
        result: result.response || "",
      });
    } catch (error) {
      return json({
        error: "La génération a échoué. Vérifie la configuration Workers AI.",
      }, 500);
    }
  },
};
