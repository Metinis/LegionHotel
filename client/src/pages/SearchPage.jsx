import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api.js";

const CITIES = [
  { code: "PAR", label: "Paris" },
  { code: "NYC", label: "New York" },
  { code: "LON", label: "London" },
  { code: "MAD", label: "Madrid" },
  { code: "TYO", label: "Tokyo" },
  { code: "ROM", label: "Rome" },
  { code: "BCN", label: "Barcelona" },
  { code: "BER", label: "Berlin" },
];

// Weather code mapping (matches backend)
const WEATHER_DESC = {
  0: { icon: "☀️", text: "Clear sky" },
  1: { icon: "🌤️", text: "Mainly clear" },
  2: { icon: "⛅", text: "Partly cloudy" },
  3: { icon: "☁️", text: "Overcast" },
  45: { icon: "🌫️", text: "Foggy" },
  48: { icon: "🌫️", text: "Foggy" },
  51: { icon: "🌦️", text: "Light drizzle" },
  53: { icon: "🌦️", text: "Moderate drizzle" },
  55: { icon: "🌧️", text: "Dense drizzle" },
  61: { icon: "🌧️", text: "Light rain" },
  63: { icon: "🌧️", text: "Rain" },
  65: { icon: "🌧️", text: "Heavy rain" },
  71: { icon: "🌨️", text: "Snow" },
  73: { icon: "🌨️", text: "Snow" },
  75: { icon: "❄️", text: "Heavy snow" },
  80: { icon: "🌦️", text: "Showers" },
  81: { icon: "🌦️", text: "Showers" },
  82: { icon: "⛈️", text: "Violent showers" },
  95: { icon: "⛈️", text: "Thunderstorm" },
};

export default function SearchPage() {
  const [city, setCity] = useState("PAR");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function handleSearch(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await api.searchHotels(city);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const weatherDesc = result?.weather
    ? WEATHER_DESC[result.weather.weatherCode] || { icon: "🌡️", text: "Unknown" }
    : null;

  return (
    <>
      <h1>Find your next stay</h1>
      <p style={{ color: "var(--color-muted)", marginBottom: "1.5rem" }}>
        Pick a city to see available hotels, current weather, and country info.
      </p>

      <form className="form-card" onSubmit={handleSearch}>
        <div className="form-row">
          <div className="form-field">
            <label htmlFor="city">City</label>
            <select
              id="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            >
              {CITIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field" style={{ alignSelf: "flex-end" }}>
            <button type="submit" disabled={loading}>
              {loading ? "Searching..." : "Search hotels"}
            </button>
          </div>
        </div>
        {error && <p style={{ color: "var(--color-danger)" }}>{error}</p>}
      </form>

      {/* Country + Weather panel */}
      {result && (result.countryInfo || result.weather) && (
        <div
          style={{
            display: "flex",
            gap: "1.5rem",
            marginTop: "1.5rem",
            flexWrap: "wrap",
          }}
        >
          {result.countryInfo && (
            <div
              className="form-card"
              style={{ flex: 1, minWidth: "280px", display: "flex", gap: "1rem" }}
            >
              <img
                src={result.countryInfo.flag}
                alt={result.countryInfo.name}
                style={{ width: 80, height: 56, objectFit: "cover", borderRadius: 4 }}
                onError={(e) => e.target.style.display = 'none'}
              />
              <div>
                <h3 style={{ marginBottom: "0.25rem" }}>{result.city}, {result.countryInfo.name}</h3>
                <div style={{ fontSize: "0.9rem", color: "var(--color-muted)" }}>
                  Currency: {result.countryInfo.currency} ({result.countryInfo.currencySymbol})
                  <br />
                  Languages: {result.countryInfo.languages?.join(", ")}
                  <br />
                  Timezone: {result.countryInfo.timezone}
                </div>
              </div>
            </div>
          )}

          {result.weather ? (
            <div
              className="form-card"
              style={{ flex: 1, minWidth: "240px", textAlign: "center" }}
            >
              <div style={{ fontSize: "3rem" }}>{weatherDesc.icon}</div>
              <h3 style={{ marginBottom: "0.25rem" }}>
                {result.weather.temperature}°C
              </h3>
              <div style={{ color: "var(--color-muted)", fontSize: "0.9rem" }}>
                {weatherDesc.text}
                <br />
                Wind {(result.weather.windSpeed * 3.6).toFixed(1)} km/h
                {result.weather.humidity && <span> · Humidity {result.weather.humidity}%</span>}
              </div>
              <div style={{ fontSize: "0.7rem", marginTop: "0.5rem", color: "var(--color-muted)" }}>
                Source: {result.weather.source}
              </div>
            </div>
          ) : result && (
            <div
              className="form-card"
              style={{ flex: 1, minWidth: "240px", textAlign: "center" }}
            >
              <div style={{ fontSize: "3rem" }}>🌡️</div>
              <div style={{ color: "var(--color-muted)", fontSize: "0.9rem" }}>
                Weather data currently unavailable
              </div>
            </div>
          )}
        </div>
      )}

      {result && result.hotels.length === 0 && (
        <p className="empty">No hotels found for this city.</p>
      )}

      {!result && !loading && (
        <p className="empty">Pick a city and click Search to start.</p>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="hotel-grid">
          {[1, 2, 3].map((i) => (
            <div key={i} className="hotel-card" style={{ opacity: 0.6 }}>
              <div style={{ height: 200, background: "#e0e0e0", borderRadius: "8px 8px 0 0" }}></div>
              <div className="body">
                <div style={{ height: 24, background: "#e0e0e0", marginBottom: 8, borderRadius: 4 }}></div>
                <div style={{ height: 16, background: "#e0e0e0", width: "60%", borderRadius: 4 }}></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Hotel grid */}
      <div className="hotel-grid">
        {result?.hotels.map((h) => (
          <div className="hotel-card" key={h._id}>
            <img src={h.imageUrl} alt={h.name} />
            <div className="body">
              <h3>{h.name}</h3>
              <div className="meta">
                {h.address} • ⭐ {h.rating}
              </div>
              <div className="price">${h.pricePerNight} / night</div>
            </div>
            <div className="footer">
              <button
                onClick={() =>
                  navigate(`/book/${h._id}`, { state: { hotel: h } })
                }
              >
                Book Now
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}