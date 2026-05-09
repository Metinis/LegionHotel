import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../services/api.js";

export default function BookingFormPage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const hotel = state?.hotel;

  const [form, setForm] = useState({
    guestName: "",
    guestEmail: "",
    checkIn: "",
    checkOut: "",
    guests: 1,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!hotel) {
    return (
      <p className="empty">
        No hotel selected. <a href="/">Go back to search</a>.
      </p>
    );
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const nights =
      (new Date(form.checkOut) - new Date(form.checkIn)) /
      (1000 * 60 * 60 * 24);
    if (nights <= 0) {
      setError("Check-out must be after check-in.");
      setSubmitting(false);
      return;
    }

    try {
      await api.createBooking({
        ...form,
        hotelName: hotel.name,
        city: hotel.city,
        totalPrice: nights * hotel.pricePerNight,
      });
      navigate("/bookings");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <h1>Book {hotel.name}</h1>
      <p style={{ color: "var(--color-muted)", marginBottom: "1.5rem" }}>
        {hotel.city} • ${hotel.pricePerNight}/night
      </p>

      <form className="form-card" onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-field">
            <label>Full name</label>
            <input
              name="guestName"
              value={form.guestName}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-field">
            <label>Email</label>
            <input
              type="email"
              name="guestEmail"
              value={form.guestEmail}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-field">
            <label>Check-in</label>
            <input
              type="date"
              name="checkIn"
              value={form.checkIn}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-field">
            <label>Check-out</label>
            <input
              type="date"
              name="checkOut"
              value={form.checkOut}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-field">
            <label>Guests</label>
            <input
              type="number"
              name="guests"
              min="1"
              max="8"
              value={form.guests}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        {error && (
          <p style={{ color: "var(--color-danger)", marginBottom: "1rem" }}>
            {error}
          </p>
        )}

        <button type="submit" disabled={submitting}>
          {submitting ? "Booking..." : "Confirm booking"}
        </button>
      </form>
    </>
  );
}
