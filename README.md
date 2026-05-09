# Legion Hotel - Hotel Booking App

**Submitted by:** Daniel Alvarado (dalvarad)

**Group Members:** Daniel Alvarado (dalvarad)

**App Description:** A hotel booking application that lets users search for hotels by city, view hotel details enriched with live data from an external API, and create / manage room reservations stored in MongoDB.

**YouTube Video Link:** _TODO: add link before submission_

**APIs:**
- Amadeus Hotel Search API (https://developers.amadeus.com/) — used to fetch hotels by city.
  - _Alternative if Amadeus setup is slow:_ OpenWeatherMap (https://openweathermap.org/api) to enrich each city with current weather.

**Contact Email:** dalvarad@umd.edu

**Deployed App Link:** _TODO: add Render link after deployment_

**AI Use:** 1. Claude

---

## Local Development

### Prerequisites
- Node.js 18+
- A MongoDB Atlas connection string
- An API key for the chosen external API

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
│   ├── models/              # Mongoose schemas
│   ├── routes/              # express.Router() endpoints
│   ├── .env.example
│   └── server.js
├── client/                  # React (Vite) frontend
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── styles/
│   └── index.html
└── README.md
```

## Requirement Checklist

| Requirement | Where |
|---|---|
| Node.js / Express / `express.Router()` | `server/routes/*.js` |
| MongoDB + Mongoose | `server/models/*.js`, `server/config/db.js` |
| At least one form | `client/src/pages/SearchPage.jsx`, `BookingPage.jsx` |
| CSS file (background-color, color, font-size, Google Font) | `client/src/styles/global.css` |
| External API | `server/routes/hotels.js` |
| Online deployment | Render |
