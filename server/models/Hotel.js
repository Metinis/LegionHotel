const mongoose = require("mongoose");

const hotelSchema = new mongoose.Schema(
  {
    externalId: { type: String, index: true }, // id from external API
    name: { type: String, required: true },
    city: { type: String, required: true },
    country: { type: String },
    address: { type: String },
    pricePerNight: { type: Number, default: 0 },
    rating: { type: Number, min: 0, max: 5, default: 0 },
    amenities: [String],
    imageUrl: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Hotel", hotelSchema);
