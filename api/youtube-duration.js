const ALLOWED_ORIGINS = new Set([
  "https://gjngngvb-byte.github.io",
  "https://tracksheet-studio-ciels-projects-9299fbb3.vercel.app",
  "https://tracksheet-studio-git-main-ciels-projects-9299fbb3.vercel.app"
]);

function setCors(req, res) {
  const origin = req.headers.origin || "";
  if (ALLOWED_ORIGINS.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

module.exports = async function handler(req, res) {
  setCors(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: "YOUTUBE_API_KEY não configurada no projeto Vercel.",
      code: "MISSING_YOUTUBE_API_KEY"
    });
  }

  const ids = Array.isArray(req.body?.videoIds)
    ? [...new Set(req.body.videoIds.filter(id => /^[A-Za-z0-9_-]{11}$/.test(id)))].slice(0, 50)
    : [];
  if (!ids.length) return res.status(400).json({ error: "Envie videoIds válidos." });

  try {
    const url = new URL("https://www.googleapis.com/youtube/v3/videos");
    url.searchParams.set("part", "contentDetails,snippet");
    url.searchParams.set("id", ids.join(","));
    url.searchParams.set("key", apiKey);

    const response = await fetch(url);
    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.error?.message || "Falha ao consultar a YouTube Data API."
      });
    }

    const videos = {};
    for (const item of data.items || []) {
      const match = String(item.contentDetails?.duration || "").match(
        /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/
      );
      const hours = Number(match?.[1] || 0);
      const minutes = Number(match?.[2] || 0);
      const seconds = Number(match?.[3] || 0);
      videos[item.id] = {
        durationSeconds: hours * 3600 + minutes * 60 + seconds,
        title: item.snippet?.title || "",
        author: item.snippet?.channelTitle || ""
      };
    }
    return res.status(200).json({ videos });
  } catch (error) {
    return res.status(502).json({ error: "Não foi possível consultar a YouTube Data API." });
  }
};
