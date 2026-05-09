const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    guestName: { type: String, required: true },
    guestEmail: { type: String, required: true },
    hotelName: { type: String, required: true },
    city: { type: String, required: true },
    checkIn: { type: Date, required: true },
    checkOut: { type: Date, required: true },
    guests: { type: Number, default: 1, min: 1 },
    totalPrice: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["confirmed", "cancelled"],
      default: "confirmed",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Booking", bookingSchema);
