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

// Use User-Agent to avoid being blocked, and a 10s timeout
const httpClient = axios.create({
  timeout: 10000,
  headers: {
    "User-Agent": "LegionHotel/1.0 (CMSC335 student project)",
    Accept: "application/json",
  },
});

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

  // Run hotels query + both API calls in parallel
  const [hotels, countryInfo, weather] = await Promise.all([
    Hotel.find({ city: cityCode }).lean().catch((e) => {
      console.error("Mongo hotels query failed:", e.message);
      return [];
    }),

    httpClient
      .get(
        `https://restcountries.com/v3.1/name/${encodeURIComponent(cityInfo.country)}?fullText=true&fields=name,flags,currencies,languages,timezones,capital`
      )
      .then((r) => {
        const c = r.data[0];
        return {
          name: c.name.common,
          flag: c.flags.svg,
          currency: Object.values(c.currencies || {})[0]?.name,
          currencySymbol: Object.values(c.currencies || {})[0]?.symbol,
          languages: Object.values(c.languages || {}),
          timezone: c.timezones?.[0],
          capital: c.capital?.[0],
        };
      })
      .catch((e) => {
        console.error(
          "REST Countries failed:",
          e.code || "",
          e.response?.status || "",
          e.message
        );
        return null;
      }),

    httpClient
      .get("https://api.open-meteo.com/v1/forecast", {
        params: {
          latitude: cityInfo.lat,
          longitude: cityInfo.lon,
          current: "temperature_2m,weather_code,wind_speed_10m",
          temperature_unit: "celsius",
        },
      })
      .then((r) => ({
        temperature: r.data.current.temperature_2m,
        windSpeed: r.data.current.wind_speed_10m,
        weatherCode: r.data.current.weather_code,
        unit: "Â°C",
      }))
      .catch((e) => {
        console.error(
          "Open-Meteo failed:",
          e.code || "",
          e.response?.status || "",
          e.message
        );
        return null;
      }),
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