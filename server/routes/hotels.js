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

// Weather code mapping
const WEATHER_CODES = {
  0: { description: "Clear sky", icon: "☀️" },
  1: { description: "Mainly clear", icon: "🌤️" },
  2: { description: "Partly cloudy", icon: "⛅" },
  3: { description: "Overcast", icon: "☁️" },
  45: { description: "Foggy", icon: "🌫️" },
  48: { description: "Depositing rime fog", icon: "🌫️" },
  51: { description: "Light drizzle", icon: "🌦️" },
  53: { description: "Moderate drizzle", icon: "🌦️" },
  55: { description: "Dense drizzle", icon: "🌧️" },
  61: { description: "Slight rain", icon: "🌧️" },
  63: { description: "Moderate rain", icon: "🌧️" },
  65: { description: "Heavy rain", icon: "🌧️" },
  71: { description: "Slight snow fall", icon: "🌨️" },
  73: { description: "Moderate snow fall", icon: "🌨️" },
  75: { description: "Heavy snow fall", icon: "❄️" },
  80: { description: "Slight rain showers", icon: "🌦️" },
  81: { description: "Moderate rain showers", icon: "🌦️" },
  82: { description: "Violent rain showers", icon: "⛈️" },
  95: { description: "Thunderstorm", icon: "⛈️" },
};

// Cache for 30 minutes
const cache = new Map();
const cacheGet = (key, maxAgeMs) => {
  const e = cache.get(key);
  if (e && Date.now() - e.time < maxAgeMs) return e.data;
  return null;
};
const cacheSet = (key, data) => {
  if (data != null) cache.set(key, { time: Date.now(), data });
};

// HTTP client with longer timeout for Render
const httpClient = axios.create({
  timeout: 30000, // 30 seconds timeout
  headers: {
    "User-Agent": "LegionHotel/1.0 (CMSC335 student project)",
    Accept: "application/json",
  },
});

function getWeatherDetails(code) {
  return WEATHER_CODES[code] || { description: "Unknown", icon: "❓" };
}

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

async function fetchWeather(cityInfo) {
  const key = `weather:${cityInfo.name}`;
  const hit = cacheGet(key, 30 * 60 * 1000);
  if (hit) {
    console.log(`📦 Using cached weather for ${cityInfo.name}`);
    return hit;
  }

  try {
    console.log(`🌤️ Fetching weather for ${cityInfo.name} from Open-Meteo...`);
    
    const response = await httpClient.get("https://api.open-meteo.com/v1/forecast", {
      params: {
        latitude: cityInfo.lat,
        longitude: cityInfo.lon,
        current: "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m",
        temperature_unit: "celsius",
        wind_speed_unit: "ms",
        timezone: "auto",
      },
    });
    
    if (response.data && response.data.current) {
      const weatherCode = response.data.current.weather_code;
      const weatherInfo = getWeatherDetails(weatherCode);
      
      const weather = {
        temperature: Math.round(response.data.current.temperature_2m * 10) / 10,
        humidity: response.data.current.relative_humidity_2m,
        windSpeed: Math.round(response.data.current.wind_speed_10m * 10) / 10,
        weatherCode: weatherCode,
        description: weatherInfo.description,
        icon: weatherInfo.icon,
        unit: "°C",
        source: "Open-Meteo",
        timestamp: new Date().toISOString(),
      };
      
      console.log(`✅ Weather for ${cityInfo.name}: ${weather.temperature}°C, ${weather.description}, Wind: ${weather.windSpeed} m/s`);
      
      cacheSet(key, weather);
      return weather;
    }
    
    throw new Error("Invalid response from Open-Meteo");
  } catch (error) {
    console.error(`❌ Open-Meteo failed for ${cityInfo.name}:`, error.message);
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
    }
    return null;
  }
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

  console.log(`🔍 Searching for city: ${cityInfo.name} (${cityCode})`);

  const [hotels, countryInfo, weather] = await Promise.all([
    Hotel.find({ city: cityCode }).lean().catch((e) => {
      console.error("Mongo hotels query failed:", e.message);
      return [];
    }),
    fetchCountryInfo(cityInfo.country),
    fetchWeather(cityInfo),
  ]);

  console.log(`✅ Response for ${cityInfo.name}: Weather=${weather ? `${weather.temperature}°C ${weather.description}` : 'None'}, Hotels=${hotels.length}`);

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