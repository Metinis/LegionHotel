// Thin wrapper around fetch() for the backend API.
// In dev the Vite proxy forwards /api -> localhost:5000.

const BASE = "/api";

async function handle(res) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  searchHotels: (city) =>
    fetch(`${BASE}/hotels/search?city=${encodeURIComponent(city)}`).then(handle),

  getHotel: (id) => fetch(`${BASE}/hotels/${id}`).then(handle),

  listBookings: () => fetch(`${BASE}/bookings`).then(handle),

  createBooking: (data) =>
    fetch(`${BASE}/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(handle),

  cancelBooking: (id) =>
    fetch(`${BASE}/bookings/${id}/cancel`, { method: "PATCH" }).then(handle),

  deleteBooking: (id) =>
    fetch(`${BASE}/bookings/${id}`, { method: "DELETE" }).then(handle),
};
