const express = require("express");
const axios = require("axios");
const https = require("https");
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

// Simple in-memory cache
const weatherCache = new Map();
const countryCache = new Map();

// Improved HTTP client for Render compatibility
const httpClient = axios.create({
  timeout: 15000,
  headers: {
    "User-Agent": "LegionHotel/1.0 (CMSC335 student project)",
    Accept: "application/json",
    "Accept-Encoding": "gzip, deflate",
  },
  httpsAgent: new https.Agent({
    rejectUnauthorized: true,
    keepAlive: true,
  }),
});

// Helper function for retry logic
async function fetchWithRetry(url, options = {}, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await httpClient.get(url, options);
      return response;
    } catch (error) {
      console.error(`Attempt ${i + 1}/${maxRetries} failed for ${url}:`, error.message);
      if (i === maxRetries - 1) throw error;
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
    }
  }
}

// Helper to get mock weather data when API fails
function getMockWeather(cityCode) {
  const mockWeather = {
    PAR: { temperature: 15, windSpeed: 12, weatherCode: 2, unit: "°C" },
    NYC: { temperature: 18, windSpeed: 15, weatherCode: 1, unit: "°C" },
    LON: { temperature: 12, windSpeed: 18, weatherCode: 3, unit: "°C" },
    MAD: { temperature: 22, windSpeed: 10, weatherCode: 0, unit: "°C" },
    TYO: { temperature: 20, windSpeed: 14, weatherCode: 1, unit: "°C" },
    ROM: { temperature: 24, windSpeed: 8, weatherCode: 0, unit: "°C" },
    BCN: { temperature: 21, windSpeed: 11, weatherCode: 0, unit: "°C" },
    BER: { temperature: 14, windSpeed: 13, weatherCode: 2, unit: "°C" },
  };
  return mockWeather[cityCode] || { temperature: 18, windSpeed: 10, weatherCode: 1, unit: "°C" };
}

router.get("/search", async (req, res) => {
  const { city } = req.query;
  
  if (!city) {
    return res.status(400).json({ error: "city query param required" });
  }

  const cityCode = city.toUpperCase();
  const cityInfo = CITY_COORDS[cityCode];

  if (!cityInfo) {
    return res.status(400).json({
      error: `Unsupported city. Try: ${Object.keys(CITY_COORDS).join(", ")}`,
    });
  }

  // Get hotels from database
  const hotels = await Hotel.find({ city: cityCode }).lean().catch((e) => {
    console.error("Mongo hotels query failed:", e.message);
    return [];
  });

  // Get country info (with cache)
  let countryInfo = null;
  const countryCacheKey = cityInfo.country;
  const cachedCountry = countryCache.get(countryCacheKey);
  
  if (cachedCountry && (Date.now() - cachedCountry.timestamp) < 24 * 60 * 60 * 1000) {
    countryInfo = cachedCountry.data;
  } else {
    try {
      const response = await fetchWithRetry(
        `https://restcountries.com/v3.1/name/${encodeURIComponent(cityInfo.country)}?fullText=true&fields=name,flags,currencies,languages,timezones,capital`
      );
      const c = response.data[0];
      countryInfo = {
        name: c.name.common,
        flag: c.flags.svg,
        currency: Object.values(c.currencies || {})[0]?.name,
        currencySymbol: Object.values(c.currencies || {})[0]?.symbol,
        languages: Object.values(c.languages || {}),
        timezone: c.timezones?.[0],
        capital: c.capital?.[0],
      };
      countryCache.set(countryCacheKey, {
        data: countryInfo,
        timestamp: Date.now()
      });
    } catch (e) {
      console.error("REST Countries failed:", e.code || "", e.response?.status || "", e.message);
      // Provide fallback country info
      countryInfo = {
        name: cityInfo.country,
        flag: null,
        currency: null,
        currencySymbol: null,
        languages: [],
        timezone: null,
        capital: cityInfo.name,
      };
    }
  }

  // Get weather data (with cache)
  let weather = null;
  const weatherCacheKey = cityCode;
  const cachedWeather = weatherCache.get(weatherCacheKey);
  
  if (cachedWeather && (Date.now() - cachedWeather.timestamp) < 60 * 60 * 1000) {
    weather = cachedWeather.data;
  } else {
    try {
      const response = await fetchWithRetry("https://api.open-meteo.com/v1/forecast", {
        params: {
          latitude: cityInfo.lat,
          longitude: cityInfo.lon,
          current: "temperature_2m,weather_code,wind_speed_10m",
          temperature_unit: "celsius",
        },
      });
      
      weather = {
        temperature: response.data.current.temperature_2m,
        windSpeed: response.data.current.wind_speed_10m,
        weatherCode: response.data.current.weather_code,
        unit: "°C",
      };
      
      weatherCache.set(weatherCacheKey, {
        data: weather,
        timestamp: Date.now()
      });
    } catch (e) {
      console.error("Open-Meteo failed:", e.code || "", e.response?.status || "", e.message);
      // Use mock weather data when API fails
      weather = getMockWeather(cityCode);
      console.log(`Using mock weather for ${cityCode}:`, weather);
    }
  }

  res.json({
    city: cityInfo.name,
    countryInfo,
    weather,
    hotels,
  });
});

router.get("/", async (_req, res) => {
  try {
    const hotels = await Hotel.find().sort({ createdAt: -1 }).limit(50);
    res.json(hotels);
  } catch (error) {
    console.error("Error fetching hotels:", error.message);
    res.status(500).json({ error: "Failed to fetch hotels" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const hotel = await Hotel.findById(req.params.id);
    if (!hotel) {
      return res.status(404).json({ error: "Hotel not found" });
    }
    res.json(hotel);
  } catch (error) {
    console.error("Error fetching hotel:", error.message);
    res.status(500).json({ error: "Failed to fetch hotel" });
  }
});

module.exports = router;