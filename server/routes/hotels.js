const express = require("express");
const axios = require("axios");
const Hotel = require("../models/Hotel");

const router = express.Router();

const CITY_COORDS = {
  PAR: { name: "Paris", country: "France", lat: 48.8566, lon: 2.3522 },
  NYC: { name: "New York", country: "United States", lat: 40.7128, lon: -74.0060 },
  LON: { name: "London", country: "United Kingdom", lat: 51.5074, lon: -0.1278 },
  MAD: { name: "Madrid", country: "Spain", lat: 40.4168, lon: -3.7038 },
  TYO: { name: "Tokyo", country: "Japan", lat: 35.6762, lon: 139.6503 },
  ROM: { name: "Rome", country: "Italy", lat: 41.9028, lon: 12.4964 },
  BCN: { name: "Barcelona", country: "Spain", lat: 41.3851, lon: 2.1734 },
  BER: { name: "Berlin", country: "Germany", lat: 52.5200, lon: 13.4050 },
};

// Caches: country 24h, weather 30 min. Only successful results are cached.
const cache = new Map();
const cacheGet = (key, maxAgeMs) => {
  const e = cache.get(key);
  if (e && Date.now() - e.time < maxAgeMs) return e.data;
  return null;
};
const cacheSet = (key, data) => {
  if (data != null) cache.set(key, { time: Date.now(), data });
};

const httpClient = axios.create({
  timeout: 8000,
  headers: {
    "User-Agent": "Mozilla/5.0 (compatible; LegionHotel/1.0; CMSC335 student project)",
    Accept: "application/json",
  },
});

async function fetchCountryInfo(country) {
  const key = `country:${country}`;
  const hit = cacheGet(key, 24 * 60 * 60 * 1000);
  if (hit) return hit;

  try {
    const r = await httpClient.get(
      `https://restcountries.com/v3.1/name/${encodeURIComponent(country)}?fullText=true&fields=name,flags,currencies,languages,timezones,capital`
    );
    const c = r.data[0];
    const result = {
      name: c.name.common,
      flag: c.flags.svg,
      currency: Object.values(c.currencies || {})[0]?.name,
      currencySymbol: Object.values(c.currencies || {})[0]?.symbol,
      languages: Object.values(c.languages || {}),
      timezone: c.timezones?.[0],
      capital: c.capital?.[0],
    };
    cacheSet(key, result);
    return result;
  } catch (e) {
    console.error("REST Countries failed:", e.response?.status || e.code, e.message);
    return null;
  }
}

// 3 weather sources, tried in order until one works
async function fetchWeather(cityInfo) {
  const key = `weather:${cityInfo.name}`;
  const hit = cacheGet(key, 30 * 60 * 1000);
  if (hit) return hit;

  // 1) Open-Meteo (no key, JSON)
  try {
    const r = await httpClient.get("https://api.open-meteo.com/v1/forecast", {
      params: {
        latitude: cityInfo.lat,
        longitude: cityInfo.lon,
        current: "temperature_2m,weather_code,wind_speed_10m",
        temperature_unit: "celsius",
      },
    });
    const result = {
      temperature: r.data.current.temperature_2m,
      windSpeed: r.data.current.wind_speed_10m,
      weatherCode: r.data.current.weather_code,
      unit: "°C",
      source: "Open-Meteo",
    };
    cacheSet(key, result);
    return result;
  } catch (e) {
    console.warn("Open-Meteo failed:", e.response?.status || e.code);
  }

  // 2) wttr.in (no key, j1 JSON format)
  try {
    const r = await httpClient.get(
      `https://wttr.in/${encodeURIComponent(cityInfo.name)}?format=j1`,
      { responseType: "json" }
    );
    // wttr returns text/plain sometimes; ensure parse
    const data = typeof r.data === "string" ? JSON.parse(r.data) : r.data;
    const cur = data.current_condition[0];
    const desc = (cur.weatherDesc[0]?.value || "").toLowerCase();
    let weatherCode = 0;
    if (desc.includes("clear") || desc.includes("sunny")) weatherCode = 0;
    else if (desc.includes("partly")) weatherCode = 2;
    else if (desc.includes("cloud") || desc.includes("overcast")) weatherCode = 3;
    else if (desc.includes("fog") || desc.includes("mist")) weatherCode = 45;
    else if (desc.includes("drizzle")) weatherCode = 51;
    else if (desc.includes("rain") || desc.includes("shower")) weatherCode = 63;
    else if (desc.includes("snow")) weatherCode = 71;
    else if (desc.includes("thunder")) weatherCode = 95;

    const result = {
      temperature: parseFloat(cur.temp_C),
      windSpeed: parseFloat(cur.windspeedKmph),
      weatherCode,
      unit: "°C",
      source: "wttr.in",
    };
    cacheSet(key, result);
    return result;
  } catch (e) {
    console.warn("wttr.in failed:", e.response?.status || e.code, e.message);
  }

  // 3) 7Timer (no key, civil format)
  try {
    const r = await httpClient.get("http://www.7timer.info/bin/civil.php", {
      params: {
        lon: cityInfo.lon,
        lat: cityInfo.lat,
        ac: 0,
        unit: "metric",
        output: "json",
        tzshift: 0,
      },
    });
    const cur = r.data.dataseries[0];
    // map cloudcover/weather string roughly to a weather code
    let weatherCode = 0;
    const w = (cur.weather || "").toLowerCase();
    if (w.includes("clear")) weatherCode = 0;
    else if (w.includes("pcloudy")) weatherCode = 2;
    else if (w.includes("cloudy") || w.includes("mcloudy")) weatherCode = 3;
    else if (w.includes("fog")) weatherCode = 45;
    else if (w.includes("rain") || w.includes("lightrain")) weatherCode = 63;
    else if (w.includes("snow")) weatherCode = 71;
    else if (w.includes("ts")) weatherCode = 95;

    const result = {
      temperature: cur.temp2m,
      windSpeed: cur.wind10m?.speed || 0,
      weatherCode,
      unit: "°C",
      source: "7Timer",
    };
    cacheSet(key, result);
    return result;
  } catch (e) {
    console.error("7Timer also failed:", e.response?.status || e.code, e.message);
  }

  return null;
}

router.get("/search", async (req, res) => {
  const { city } = req.query;
  if (!city) return res.status(400).json({ error: "city query param required" });

  const cityCode = city.toUpperCase();
  const cityInfo = CITY_COORDS[cityCode];

  if (!cityInfo) {
    return res.status(400).json({
      error: `Unsupported city. Try: ${Object.keys(CITY_COORDS).join(", ")}`,
    });
  }

  const [hotels, countryInfo, weather] = await Promise.all([
    Hotel.find({ city: cityCode }).lean().catch((e) => {
      console.error("Mongo hotels query failed:", e.message);
      return [];
    }),
    fetchCountryInfo(cityInfo.country),
    fetchWeather(cityInfo),
  ]);

  res.json({
    city: cityInfo.name,
    countryInfo,
    weather,
    hotels,
  });
});

router.get("/", async (_req, res) => {
  const hotels = await Hotel.find().sort({ createdAt: -1 }).limit(50);
  res.json(hotels);
});

router.get("/:id", async (req, res) => {
  const hotel = await Hotel.findById(req.params.id);
  if (!hotel) return res.status(404).json({ error: "Hotel not found" });
  res.json(hotel);
});

module.exports = router;
