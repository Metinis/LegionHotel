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
    
    // wttr.in weatherCode mapping to Open-Meteo compatible codes
    const wttrCode = parseInt(cur.weatherCode);
    let weatherCode = mapWttrCodeToOpenMeteo(wttrCode);
    
    const weatherInfo = getWeatherDetails(weatherCode);
    
    const weather = {
      temperature: parseFloat(cur.temp_C),
      feelsLike: parseFloat(cur.FeelsLikeC),
      humidity: parseInt(cur.humidity),
      windSpeed: parseFloat(cur.windspeedKmph) / 3.6, // Convert km/h to m/s
      windDirection: cur.winddirDegree,
      pressure: parseInt(cur.pressure),
      visibility: parseInt(cur.visibility),
      uvIndex: parseInt(cur.uvIndex),
      cloudcover: parseInt(cur.cloudcover),
      precipitation: parseFloat(cur.precipMM),
      weatherCode: weatherCode,
      description: weatherInfo.description,
      icon: weatherInfo.icon,
      unit: "°C",
      source: "wttr.in",
      timestamp: new Date().toISOString(),
      // Include raw description from wttr.in for reference
      rawDescription: cur.weatherDesc[0]?.value || "",
    };
    
    console.log(`✅ Weather for ${cityInfo.name}: ${weather.temperature}°C, feels like ${weather.feelsLike}°C, ${weather.description}`);
    cacheSet(key, weather);
    return weather;
  } catch (error) {
    console.error(`❌ wttr.in failed for ${cityInfo.name}:`, error.message);
    return null;
  }
}

// Map wttr.in weather codes to Open-Meteo compatible codes
function mapWttrCodeToOpenMeteo(wttrCode) {
  // wttr.in codes: https://www.worldweatheronline.com/weather-api/api/docs/weather-icons.aspx
  const codeMap = {
    113: 0,  // Sunny/Clear
    116: 2,  // Partly cloudy
    119: 3,  // Cloudy
    122: 3,  // Overcast
    143: 45, // Mist/Fog
    176: 61, // Patchy rain possible
    179: 61, // Patchy snow possible
    182: 61, // Patchy sleet possible
    185: 61, // Patchy freezing drizzle possible
    200: 95, // Thundery outbreaks possible
    227: 71, // Blowing snow
    230: 71, // Blizzard
    248: 45, // Fog
    260: 45, // Freezing fog
    263: 61, // Patchy light drizzle
    266: 63, // Light drizzle
    281: 63, // Freezing drizzle
    284: 63, // Heavy freezing drizzle
    293: 61, // Patchy light rain
    296: 61, // Light rain
    299: 63, // Moderate rain at times
    302: 63, // Moderate rain
    305: 65, // Heavy rain at times
    308: 65, // Heavy rain
    311: 61, // Light freezing rain
    314: 63, // Moderate or heavy freezing rain
    317: 61, // Light sleet
    320: 63, // Moderate or heavy sleet
    323: 71, // Light snow
    326: 71, // Moderate snow
    329: 75, // Heavy snow
    332: 75, // Blizzard
    335: 75, // Blizzard
    338: 75, // Heavy snow
    350: 61, // Ice pellets
    353: 61, // Light rain shower
    356: 63, // Moderate or heavy rain shower
    359: 65, // Torrential rain shower
    362: 61, // Light sleet showers
    365: 63, // Moderate or heavy sleet showers
    368: 71, // Light snow showers
    371: 75, // Moderate or heavy snow showers
    374: 61, // Light ice pellets showers
    377: 63, // Moderate or heavy ice pellets showers
    386: 95, // Thundery showers with hail
    389: 95, // Thundery showers with hail
    392: 95, // Thundery showers with hail
    395: 95, // Thundery showers with hail
  };
  
  return codeMap[wttrCode] || 1; // Default to mainly clear if unknown
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