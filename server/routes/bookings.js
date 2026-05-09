const express = require("express");
const Booking = require("../models/Booking");

const router = express.Router();

// POST /api/bookings  -> create a booking (this is the form-driven endpoint)
router.post("/", async (req, res) => {
  try {
    const booking = await Booking.create(req.body);
    res.status(201).json(booking);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/bookings  -> list all bookings (most recent first)
router.get("/", async (_req, res) => {
  const bookings = await Booking.find().sort({ createdAt: -1 });
  res.json(bookings);
});

// GET /api/bookings/:id
router.get("/:id", async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) return res.status(404).json({ error: "Booking not found" });
  res.json(booking);
});

// PATCH /api/bookings/:id/cancel
router.patch("/:id/cancel", async (req, res) => {
  const booking = await Booking.findByIdAndUpdate(
    req.params.id,
    { status: "cancelled" },
    { new: true }
  );
  if (!booking) return res.status(404).json({ error: "Booking not found" });
  res.json(booking);
});

// DELETE /api/bookings/:id
router.delete("/:id", async (req, res) => {
  const result = await Booking.findByIdAndDelete(req.params.id);
  if (!result) return res.status(404).json({ error: "Booking not found" });
  res.json({ ok: true });
});

module.exports = router;
