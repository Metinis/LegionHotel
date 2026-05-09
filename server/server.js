require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const connectDB = require("./config/db");
const hotelsRouter = require("./routes/hotels");
const bookingsRouter = require("./routes/bookings");

const app = express();

// --- Middleware ---
app.use(express.json());
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN?.split(",") || "*",
  })
);

// --- API routes (each uses express.Router()) ---
app.use("/api/hotels", hotelsRouter);
app.use("/api/bookings", bookingsRouter);

// Health check
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

// --- Serve React build in production ---
if (process.env.NODE_ENV === "production") {
  const clientBuildPath = path.join(__dirname, "..", "client", "dist");
  app.use(express.static(clientBuildPath));
  app.get("*", (_req, res) =>
    res.sendFile(path.join(clientBuildPath, "index.html"))
  );
}

// --- Start ---
const PORT = process.env.PORT || 5001;
connectDB().then(() => {
  app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
});
