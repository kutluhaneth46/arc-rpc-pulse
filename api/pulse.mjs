import { pulseAll } from "../lib/pulse.mjs";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=20, stale-while-revalidate=40");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  try {
    const data = await pulseAll();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "pulse failed",
    });
  }
}
