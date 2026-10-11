
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json; charset=utf-8",
    };

    const json = (data, status = 200) =>
      new Response(JSON.stringify(data), { status, headers });

    if (request.method === "OPTIONS") {
      return new Response(null, { headers });
    }

    if (url.pathname === "/api/health") {
      return json({ ok: true, service: "NOVA AI API" });
    }

    if (url.pathname === "/" || url.pathname === "/index.html") {
      return env.ASSETS.fetch(
        new Request(new URL("/index.html", url.origin), request)
      );
    }

    if (url.pathname !== "/api/generate" || request.method !== "POST") {
      if (!url.pathname.startsWith("/api/")) {
        return env.ASSETS.fetch(request);
      }
      return json({ error: "Route introuvable" }, 404);
    }

    if (!env.AI) {
      return json({ error: "Workers AI n'est pas connecté." }, 503);
    }

    try {
      const body = await request.json();
      const prompt = String(body.prompt || "").trim();
      const mode = body.mode === "site" ? "site" : "chat";

      if (!prompt || prompt.length > 6000) {
        return json({ error: "Prompt invalide (1 à 6000 caractères)." }, 400);
      }

      const system = mode === "site"
        ? "Tu es NOVA AI, développeur web expert. Génère une page complète en HTML avec CSS intégré. Réponds uniquement avec le HTML. N'inclus pas de clés secrètes."
        : "Tu es NOVA AI, un assistant utile. Réponds clairement en français.";

      const result = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
        max_tokens: mode === "site" ? 3000 : 1000,
      });

      return json({
        ok: true,
        mode,
        result: result.response || "",
      });
    } catch {
      return json({ error: "Erreur lors de la génération IA." }, 500);
    }
  },
};
