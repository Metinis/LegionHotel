import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api.js";

export default function SearchPage() {
  const [city, setCity] = useState("PAR");
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function handleSearch(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await api.searchHotels(city);
      setHotels(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <h1>Find your next stay</h1>
      <p style={{ color: "var(--color-muted)", marginBottom: "1.5rem" }}>
        Search hotels by IATA city code (e.g. <strong>PAR</strong> for Paris,{" "}
        <strong>NYC</strong> for New York, <strong>LON</strong> for London).
      </p>

      <form className="form-card" onSubmit={handleSearch}>
        <div className="form-row">
          <div className="form-field">
            <label htmlFor="city">City code</label>
            <input
              id="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="PAR"
              required
            />
          </div>
          <div className="form-field" style={{ alignSelf: "flex-end" }}>
            <button type="submit" disabled={loading}>
              {loading ? "Searching..." : "Search hotels"}
            </button>
          </div>
        </div>
        {error && <p style={{ color: "var(--color-danger)" }}>{error}</p>}
      </form>

      {hotels.length === 0 && !loading && (
        <p className="empty">No hotels yet — run a search to get started.</p>
      )}

      <div className="hotel-grid">
        {hotels.map((h) => (
          <div className="hotel-card" key={h.externalId}>
            <img src={h.imageUrl} alt={h.name} />
            <div className="body">
              <h3>{h.name}</h3>
              <div className="meta">
                {h.city} • ⭐ {h.rating}
              </div>
              <div className="price">${h.pricePerNight} / night</div>
            </div>
            <div className="footer">
              <button
                onClick={() =>
                  navigate(`/book/${h.externalId}`, { state: { hotel: h } })
                }
              >
                Book
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
