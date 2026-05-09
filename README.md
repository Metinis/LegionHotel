# Legion Hotel - Hotel Booking App

**Submitted by:** Denis Muraska (dmuraska)

**Group Members:** Daniel Alvarado (dalvarad), Denis Muraska (dmuraska)

**App Description:** A hotel booking application that lets users browse hotels by city, view live country information and current weather pulled from external APIs, and create / cancel / delete room reservations that are persisted in MongoDB.

**YouTube Video Link:** https://www.youtube.com/watch?v=txOjnonun-c

**APIs:**
- REST Countries API (https://restcountries.com/) — country information (flag, currency, languages, timezone, capital).
- wttr.in (https://wttr.in/) — current weather data for the selected city.


**Contact Email:** dalvarad@terpmail.umd.edu dmuraska@terpmail.umd.edu

**Deployed App Link:** https://legionhotel.onrender.com/

**AI Use:** 1. Claude

---

## Local Development, Deepseek

### Prerequisites
- Node.js 18+
- A MongoDB Atlas connection string

### Setup
```bash
# 1. Install backend dependencies
cd server
npm install

# 2. Install frontend dependencies
cd ../client
npm install

# 3. Create server/.env (see server/.env.example)

# 4. Run backend (from /server)
npm run dev

# 5. Run frontend (from /client, in a second terminal)
npm run dev
```

The frontend runs on `http://localhost:5173` and the backend on `http://localhost:5000`.

## Project Structure
```
legion-hotel/
├── server/                  # Express + MongoDB API
│   ├── config/db.js
│   ├── models/              # Mongoose schemas (Hotel, Booking)
│   ├── routes/              # express.Router() endpoints
│   ├── seed.js              # Database seed script
│   └── server.js
├── client/                  # React (Vite) frontend
│   ├── src/
│   │   ├── pages/           # SearchPage, BookingFormPage, BookingsPage
│   │   ├── services/        # API client
│   │   └── styles/          # global.css with Google Fonts
│   └── index.html
└── README.md
```

## Requirement Checklist

| Requirement | Where |
|---|---|
| Node.js / Express / `express.Router()` | `server/routes/hotels.js`, `server/routes/bookings.js` |
| MongoDB + Mongoose | `server/models/Hotel.js`, `server/models/Booking.js`, `server/config/db.js` |
| At least one form | `client/src/pages/SearchPage.jsx`, `client/src/pages/BookingFormPage.jsx` |
| CSS file (background-color, color, font-size, Google Font) | `client/src/styles/global.css` |
| External API | `server/routes/hotels.js` (REST Countries + wttr.in / Open-Meteo) |
| Online deployment | https://legionhotel.onrender.com/ |
