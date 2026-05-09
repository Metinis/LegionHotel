const express = require("express");
const axios = require("axios");
const Hotel = require("../models/Hotel");

const router = express.Router();

/**
 * Search hotels by city. Returns hotels from MongoDB enriched with:
 *  - REST Countries API (country info, currency, flag, timezone)
 *  - Open-Meteo API (current weather at the city)
 *
 * Both APIs are free and require no API key.
 *
 * GET /api/hotels/search?city=PAR
 */

// City -> coordinates lookup (used by Open-Meteo for weather)
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

  try {
    // 1) Get hotels from MongoDB for this city
    const hotels = await Hotel.find({ city: cityCode }).lean();

    // 2) Call REST Countries API for country info
    let countryInfo = null;
    try {
      const countryRes = await axios.get(
        `https://restcountries.com/v3.1/name/${encodeURIComponent(cityInfo.country)}?fullText=true`
      );
      const c = countryRes.data[0];
      countryInfo = {
        name: c.name.common,
        flag: c.flags.svg,
        currency: Object.values(c.currencies || {})[0]?.name,
        currencySymbol: Object.values(c.currencies || {})[0]?.symbol,
        languages: Object.values(c.languages || {}),
        timezone: c.timezones?.[0],
        capital: c.capital?.[0],
      };
    } catch (e) {
      console.warn("REST Countries lookup failed:", e.message);
    }

    // 3) Call Open-Meteo for current weather
    let weather = null;
    try {
      const weatherRes = await axios.get(
        "https://api.open-meteo.com/v1/forecast",
        {
          params: {
            latitude: cityInfo.lat,
            longitude: cityInfo.lon,
            current: "temperature_2m,weather_code,wind_speed_10m",
            temperature_unit: "celsius",
          },
        }
      );
      weather = {
        temperature: weatherRes.data.current.temperature_2m,
        windSpeed: weatherRes.data.current.wind_speed_10m,
        weatherCode: weatherRes.data.current.weather_code,
        unit: "°C",
      };
    } catch (e) {
      console.warn("Open-Meteo lookup failed:", e.message);
    }

    res.json({
      city: cityInfo.name,
      countryInfo,
      weather,
      hotels,
    });
  } catch (err) {
    console.error("Search failed:", err.message);
    res.status(500).json({ error: "Hotel search failed" });
  }
});

// GET /api/hotels  -> list all hotels
router.get("/", async (_req, res) => {
  const hotels = await Hotel.find().sort({ createdAt: -1 }).limit(50);
  res.json(hotels);
});

// GET /api/hotels/:id
router.get("/:id", async (req, res) => {
  const hotel = await Hotel.findById(req.params.id);
  if (!hotel) return res.status(404).json({ error: "Hotel not found" });
  res.json(hotel);
});

module.exports = router;
