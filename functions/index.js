// functions/index.js
import * as functions from "firebase-functions";
import fetch from "node-fetch";

const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";

// GET /api/weather?latitude=...&longitude=...&timezone=auto
export const weatherProxy = functions.https.onRequest(async (req, res) => {
  if (req.method !== "GET") {
    res.status(405).send("Method not allowed");
    return;
  }

  const lat = req.query.latitude || "32.0853";
  const lon = req.query.longitude || "34.7818";
  const timezone = req.query.timezone || "auto";

  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    daily: "weathercode,temperature_2m_max,precipitation_probability_max",
    timezone
  });

  const url = `${OPEN_METEO_URL}?${params.toString()}`;

  try {
    const r = await fetch(url);
    if (!r.ok) {
      console.error("open-meteo bad response", r.status);
      res.status(500).json({ error: "upstream error", status: r.status });
      return;
    }

    const data = await r.json();
    // let your web app read it
    res.set("Access-Control-Allow-Origin", "*");
    res.status(200).json(data);
  } catch (err) {
    console.error("open-meteo fetch failed", err);
    res.status(500).json({ error: "fetch failed" });
  }
});
