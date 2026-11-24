const ALLOWED_ORIGINS = new Set([
  "https://gjngngvb-byte.github.io",
  "https://tracksheet-studio.vercel.app"
]);

module.exports = async function handler(req, res) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "GEMINI_API_KEY não configurada no servidor." });
  }

  try {
    const body = req.body || {};
    if (!Array.isArray(body.contents) || body.contents.length === 0) {
      return res.status(400).json({ error: "Payload Gemini inválido: contents é obrigatório." });
    }

    const upstream = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + encodeURIComponent(apiKey),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      }
    );

    const responseText = await upstream.text();
    res.status(upstream.status);
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.send(responseText);
  } catch (error) {
    return res.status(500).json({
      error: "Falha ao consultar o Gemini.",
      detail: error && error.message ? error.message : "Erro desconhecido"
    });
  }
};
