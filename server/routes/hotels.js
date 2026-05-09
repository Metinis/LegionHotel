const express = require("express");
const axios = require("axios");
const Hotel = require("../models/Hotel");

const router = express.Router();

// --- Amadeus token cache ---
let cachedToken = null;
let tokenExpiresAt = 0;

async function getAmadeusToken() {
  if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken;

  const res = await axios.post(
    "https://test.api.amadeus.com/v1/security/oauth2/token",
    new URLSearchParams({
      grant_type: "client_credentials",
      client_id: process.env.AMADEUS_CLIENT_ID,
      client_secret: process.env.AMADEUS_CLIENT_SECRET,
    }),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );

  cachedToken = res.data.access_token;
  tokenExpiresAt = Date.now() + (res.data.expires_in - 30) * 1000;
  return cachedToken;
}

/**
 * GET /api/hotels/search?city=PAR
 * Looks up hotels from the Amadeus API for a city code (IATA code, e.g. PAR, NYC, LON).
 * Caches results into MongoDB so they can be retrieved later.
 */
router.get("/search", async (req, res) => {
  const { city } = req.query;
  if (!city) return res.status(400).json({ error: "city query param required" });

  try {
    const token = await getAmadeusToken();
    const apiRes = await axios.get(
      "https://test.api.amadeus.com/v1/reference-data/locations/hotels/by-city",
      {
        headers: { Authorization: `Bearer ${token}` },
        params: { cityCode: city.toUpperCase() },
      }
    );

    const hotels = (apiRes.data.data || []).slice(0, 20).map((h) => ({
      externalId: h.hotelId,
      name: h.name,
      city: city.toUpperCase(),
      country: h.address?.countryCode,
      address: h.address?.lines?.join(", ") || "",
      // demo values: the test endpoint doesn't return price/rating reliably
      pricePerNight: 80 + Math.floor(Math.random() * 220),
      rating: Math.round((3 + Math.random() * 2) * 10) / 10,
      amenities: ["Wi-Fi", "Breakfast", "Parking"],
      imageUrl: `https://source.unsplash.com/600x400/?hotel,${city}`,
    }));

    // Upsert into MongoDB so we have local copies
    await Promise.all(
      hotels.map((h) =>
        Hotel.updateOne({ externalId: h.externalId }, h, { upsert: true })
      )
    );

    res.json(hotels);
  } catch (err) {
    console.error("Amadeus search failed:", err.response?.data || err.message);
    res.status(500).json({ error: "Hotel search failed" });
  }
});

// GET /api/hotels  -> list all cached hotels
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
