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

// Cache
const cache = new Map();
const cacheGet = (key, maxAgeMs) => {
  const e = cache.get(key);
  if (e && Date.now() - e.time < maxAgeMs) return e.data;
  return null;
};
const cacheSet = (key, data) => {
  if (data != null) cache.set(key, { time: Date.now(), data });
};

// HTTP client
const httpClient = axios.create({
  timeout: 30000,
  headers: {
    "User-Agent": "LegionHotel/1.0 (CMSC335 student project)",
    Accept: "application/json",
  },
});

function getWeatherDetails(code) {
  return WEATHER_CODES[code] || { description: "Unknown", icon: "❓" };
}

// Map wttr.in description to weather code
function mapWttrToCode(desc) {
  const d = desc.toLowerCase();
  if (d.includes("clear") || d.includes("sunny")) return 0;
  if (d.includes("partly cloudy")) return 2;
  if (d.includes("cloudy") || d.includes("overcast")) return 3;
  if (d.includes("fog") || d.includes("mist")) return 45;
  if (d.includes("drizzle")) return 51;
  if (d.includes("rain") || d.includes("shower")) return 61;
  if (d.includes("snow")) return 71;
  if (d.includes("thunder")) return 95;
  return 1;
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
  if (hit) return hit;

  try {
    console.log(`🌤️ Fetching weather for ${cityInfo.name} from wttr.in...`);
    const response = await httpClient.get(
      `https://wttr.in/${cityInfo.lat},${cityInfo.lon}?format=j1`
    );
    
    let data = response.data;
    if (typeof data === "string") {
      data = JSON.parse(data);
    }
    
    if (!data || !data.current_condition || !data.current_condition[0]) {
      throw new Error("Invalid response from wttr.in");
    }
    
    const cur = data.current_condition[0];
    const weatherDesc = cur.weatherDesc[0]?.value || "";
    const weatherCode = mapWttrToCode(weatherDesc);
    const weatherInfo = getWeatherDetails(weatherCode);
    
    const weather = {
      temperature: parseFloat(cur.temp_C),
      humidity: parseInt(cur.humidity),
      windSpeed: parseFloat(cur.windspeedKmph) / 3.6, // Convert km/h to m/s
      weatherCode: weatherCode,
      description: weatherInfo.description,
      icon: weatherInfo.icon,
      unit: "°C",
      source: "wttr.in",
      timestamp: new Date().toISOString(),
    };
    
    console.log(`✅ Weather for ${cityInfo.name}: ${weather.temperature}°C, ${weather.description}`);
    cacheSet(key, weather);
    return weather;
  } catch (error) {
    console.error(`❌ wttr.in failed for ${cityInfo.name}:`, error.message);
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