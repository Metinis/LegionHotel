import { Routes, Route, Link } from "react-router-dom";
import SearchPage from "./pages/SearchPage.jsx";
import BookingsPage from "./pages/BookingsPage.jsx";
import BookingFormPage from "./pages/BookingFormPage.jsx";

export default function App() {
  return (
    <>
      <nav className="navbar">
        <Link to="/" className="brand">
          Legion Hotel
        </Link>
        <div>
          <Link to="/">Search</Link>
          <Link to="/bookings">My Bookings</Link>
        </div>
      </nav>

      <main className="container">
        <Routes>
          <Route path="/" element={<SearchPage />} />
          <Route path="/book/:hotelId" element={<BookingFormPage />} />
          <Route path="/bookings" element={<BookingsPage />} />
        </Routes>
      </main>
    </>
  );
}
