import { useEffect, useState } from "react";
import { api } from "../services/api.js";

export default function BookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      setBookings(await api.listBookings());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCancel(id) {
    await api.cancelBooking(id);
    load();
  }

  async function handleDelete(id) {
    if (!confirm("Delete this booking?")) return;
    await api.deleteBooking(id);
    load();
  }

  if (loading) return <p className="empty">Loading…</p>;
  if (!bookings.length)
    return <p className="empty">You have no bookings yet.</p>;

  return (
    <>
      <h1>My Bookings</h1>
      <div style={{ marginTop: "1.5rem" }}>
        {bookings.map((b) => (
          <div
            key={b._id}
            className={`booking-row ${b.status === "cancelled" ? "cancelled" : ""}`}
          >
            <div>
              <h3 style={{ marginBottom: "0.25rem" }}>{b.hotelName}</h3>
              <div style={{ fontSize: "0.9rem", color: "var(--color-muted)" }}>
                {b.city} • {new Date(b.checkIn).toLocaleDateString()} →{" "}
                {new Date(b.checkOut).toLocaleDateString()} • {b.guests} guest(s)
              </div>
              <div style={{ fontSize: "0.9rem", marginTop: "0.25rem" }}>
                {b.guestName} ({b.guestEmail}) • Total ${b.totalPrice}
              </div>
            </div>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <span className={`status-pill ${b.status === "cancelled" ? "cancelled" : ""}`}>
                {b.status}
              </span>
              {b.status !== "cancelled" && (
                <button className="accent" onClick={() => handleCancel(b._id)}>
                  Cancel
                </button>
              )}
              <button className="danger" onClick={() => handleDelete(b._id)}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
