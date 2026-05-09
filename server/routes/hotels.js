const express = require("express");
const axios = require("axios");
const Hotel = require("../models/Hotel");

const router = express.Router();

const CITY_COORDS = {
  PAR: {
    name: "Paris",
    country: "France",
    lat: 48.8566,
    lon: 2.3522,
  },
  NYC: {
    name: "New York",
    country: "United States",
    lat: 40.7128,
    lon: -74.006,
  },
  LON: {
    name: "London",
    country: "United Kingdom",
    lat: 51.5074,
    lon: -0.1278,
  },
  MAD: {
    name: "Madrid",
    country: "Spain",
    lat: 40.4168,
    lon: -3.7038,
  },
  TYO: {
    name: "Tokyo",
    country: "Japan",
    lat: 35.6762,
    lon: 139.6503,
  },
  ROM: {
    name: "Rome",
    country: "Italy",
    lat: 41.9028,
    lon: 12.4964,
  },
  BCN: {
    name: "Barcelona",
    country: "Spain",
    lat: 41.3851,
    lon: 2.1734,
  },
  BER: {
    name: "Berlin",
    country: "Germany",
    lat: 52.52,
    lon: 13.405,
  },
};

// --------------------
// SIMPLE MEMORY CACHE
// --------------------

const cache = new Map();

function cacheGet(key, maxAgeMs) {
  const entry = cache.get(key);

  if (!entry) return null;

  const isExpired = Date.now() - entry.time > maxAgeMs;

  if (isExpired) {
    cache.delete(key);
    return null;
  }

  return entry.data;
}

function cacheSet(key, data) {
  if (data != null) {
    cache.set(key, {
      time: Date.now(),
      data,
    });
  }
}

// --------------------
// AXIOS CLIENT
// --------------------

const httpClient = axios.create({
  timeout: 8000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (compatible; LegionHotel/1.0; CMSC335 student project)",
    Accept: "application/json",
  },
});

// --------------------
// WEATHER DESCRIPTION
// --------------------

function weatherDescription(code) {
  const map = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",

    45: "Fog",
    48: "Depositing rime fog",

    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",

    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",

    71: "Slight snow",
    73: "Moderate snow",
    75: "Heavy snow",

    80: "Rain showers",
    81: "Heavy rain showers",

    95: "Thunderstorm",
  };

  return map[code] || "Unknown";
}

// --------------------
// COUNTRY INFO
// --------------------

async function fetchCountryInfo(country) {
  const key = `country:${country}`;

  const cached = cacheGet(key, 24 * 60 * 60 * 1000);

  if (cached) return cached;

  try {
    const response = await httpClient.get(
      `https://restcountries.com/v3.1/name/${encodeURIComponent(
        country
      )}?fullText=true&fields=name,flags,currencies,languages,timezones,capital`
    );

    const c = response.data[0];

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
    console.error(
      "REST Countries failed:",
      e.response?.status || e.code,
      e.message
    );

    return null;
  }
}

// --------------------
// WEATHER
// --------------------

async function fetchWeather(cityInfo) {
  const key = `weather:${cityInfo.name}`;

  // 5 minute cache
  const cached = cacheGet(key, 5 * 60 * 1000);

  if (cached) return cached;

  try {
    const response = await httpClient.get(
      "https://api.open-meteo.com/v1/forecast",
      {
        params: {
          latitude: cityInfo.lat,
          longitude: cityInfo.lon,
          current: [
            "temperature_2m",
            "relative_humidity_2m",
            "apparent_temperature",
            "weather_code",
            "wind_speed_10m",
          ].join(","),
          timezone: "auto",
        },
      }
    );

    const current = response.data.current;

    const result = {
      temperature: current.temperature_2m,
      feelsLike: current.apparent_temperature,
      humidity: current.relative_humidity_2m,
      windSpeed: current.wind_speed_10m,

      weatherCode: current.weather_code,
      description: weatherDescription(current.weather_code),

      unit: "°C",
      source: "Open-Meteo",

      timestamp: current.time,
    };

    cacheSet(key, result);

    return result;
  } catch (e) {
    console.error(
      "Weather fetch failed:",
      e.response?.status || e.code,
      e.message
    );

    return null;
  }
}

// --------------------
// ROUTES
// --------------------

router.get("/search", async (req, res) => {
  const { city } = req.query;

  if (!city) {
    return res.status(400).json({
      error: "city query param required",
    });
  }

  const cityCode = city.toUpperCase();

  const cityInfo = CITY_COORDS[cityCode];

  if (!cityInfo) {
    return res.status(400).json({
      error: `Unsupported city. Try: ${Object.keys(CITY_COORDS).join(", ")}`,
    });
  }

  try {
    const [hotels, countryInfo, weather] = await Promise.all([
      Hotel.find({ city: cityCode }).lean(),

      fetchCountryInfo(cityInfo.country),

      fetchWeather(cityInfo),
    ]);

    return res.json({
      city: cityInfo.name,
      countryInfo,
      weather,
      hotels,
    });
  } catch (e) {
    console.error("Search route failed:", e.message);

    return res.status(500).json({
      error: "Internal server error",
    });
  }
});

// GET ALL HOTELS

router.get("/", async (_req, res) => {
  try {
    const hotels = await Hotel.find()
      .sort({ createdAt: -1 })
      .limit(50);

    return res.json(hotels);
  } catch (e) {
    console.error("Fetch hotels failed:", e.message);

    return res.status(500).json({
      error: "Failed to fetch hotels",
    });
  }
});

// GET HOTEL BY ID

router.get("/:id", async (req, res) => {
  try {
    const hotel = await Hotel.findById(req.params.id);

    if (!hotel) {
      return res.status(404).json({
        error: "Hotel not found",
      });
    }

    return res.json(hotel);
  } catch (e) {
    console.error("Fetch hotel failed:", e.message);

    return res.status(500).json({
      error: "Failed to fetch hotel",
    });
  }
});

module.exports = router;