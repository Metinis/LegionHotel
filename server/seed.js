/**
 * Seed script - populates the database with sample hotels and bookings.
 *
 * Usage (from /server folder):
 *   node seed.js          -> adds sample data
 *   node seed.js --reset  -> wipes hotels + bookings, then adds sample data
 */

require("dotenv").config();
const mongoose = require("mongoose");
const Hotel = require("./models/Hotel");
const Booking = require("./models/Booking");

const sampleHotels = [
  {
    externalId: "SEED-PAR-001",
    name: "Le Grand Boulevard",
    city: "PAR",
    country: "FR",
    address: "12 Rue de Rivoli, Paris",
    pricePerNight: 245,
    rating: 4.7,
    amenities: ["Wi-Fi", "Spa", "Breakfast", "Pool"],
    imageUrl: "https://source.unsplash.com/600x400/?paris,hotel",
  },
  {
    externalId: "SEED-PAR-002",
    name: "Hôtel Montmartre",
    city: "PAR",
    country: "FR",
    address: "8 Place du Tertre, Paris",
    pricePerNight: 165,
    rating: 4.3,
    amenities: ["Wi-Fi", "Breakfast"],
    imageUrl: "https://source.unsplash.com/600x400/?montmartre",
  },
  {
    externalId: "SEED-NYC-001",
    name: "Times Square Stay",
    city: "NYC",
    country: "US",
    address: "234 W 42nd St, New York",
    pricePerNight: 320,
    rating: 4.5,
    amenities: ["Wi-Fi", "Gym", "Bar", "Parking"],
    imageUrl: "https://source.unsplash.com/600x400/?newyork,hotel",
  },
  {
    externalId: "SEED-NYC-002",
    name: "Brooklyn Bridge Inn",
    city: "NYC",
    country: "US",
    address: "55 Front St, Brooklyn",
    pricePerNight: 210,
    rating: 4.2,
    amenities: ["Wi-Fi", "Breakfast", "Pet friendly"],
    imageUrl: "https://source.unsplash.com/600x400/?brooklyn,bridge",
  },
  {
    externalId: "SEED-LON-001",
    name: "The Westminster",
    city: "LON",
    country: "GB",
    address: "20 Buckingham Gate, London",
    pricePerNight: 280,
    rating: 4.6,
    amenities: ["Wi-Fi", "Spa", "Restaurant"],
    imageUrl: "https://source.unsplash.com/600x400/?london,hotel",
  },
  {
    externalId: "SEED-LON-002",
    name: "Camden Loft",
    city: "LON",
    country: "GB",
    address: "10 Camden High St, London",
    pricePerNight: 130,
    rating: 4.0,
    amenities: ["Wi-Fi", "Kitchen"],
    imageUrl: "https://source.unsplash.com/600x400/?camden,london",
  },
  {
    externalId: "SEED-MAD-001",
    name: "Hotel Sol Madrid",
    city: "MAD",
    country: "ES",
    address: "Puerta del Sol 5, Madrid",
    pricePerNight: 145,
    rating: 4.4,
    amenities: ["Wi-Fi", "Breakfast", "Rooftop bar"],
    imageUrl: "https://source.unsplash.com/600x400/?madrid,hotel",
  },
  {
    externalId: "SEED-MAD-002",
    name: "Retiro Park Suites",
    city: "MAD",
    country: "ES",
    address: "Calle de Alcalá 100, Madrid",
    pricePerNight: 195,
    rating: 4.5,
    amenities: ["Wi-Fi", "Pool", "Gym"],
    imageUrl: "https://source.unsplash.com/600x400/?madrid,park",
  },
];

const sampleBookings = [
  {
    guestName: "Daniel Alvarado",
    guestEmail: "dalvarad@umd.edu",
    hotelName: "Le Grand Boulevard",
    city: "PAR",
    checkIn: new Date("2026-06-15"),
    checkOut: new Date("2026-06-18"),
    guests: 2,
    totalPrice: 735,
    status: "confirmed",
  },
  {
    guestName: "Maria Santos",
    guestEmail: "msantos@example.com",
    hotelName: "Times Square Stay",
    city: "NYC",
    checkIn: new Date("2026-07-01"),
    checkOut: new Date("2026-07-05"),
    guests: 1,
    totalPrice: 1280,
    status: "confirmed",
  },
  {
    guestName: "John Doe",
    guestEmail: "jdoe@example.com",
    hotelName: "Camden Loft",
    city: "LON",
    checkIn: new Date("2026-05-20"),
    checkOut: new Date("2026-05-22"),
    guests: 2,
    totalPrice: 260,
    status: "cancelled",
  },
];

async function seed() {
  const reset = process.argv.includes("--reset");

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    if (reset) {
      const h = await Hotel.deleteMany({});
      const b = await Booking.deleteMany({});
      console.log(`🗑️  Deleted ${h.deletedCount} hotels, ${b.deletedCount} bookings`);
    }

    // Upsert hotels (won't duplicate if you run twice)
    let hotelCount = 0;
    for (const h of sampleHotels) {
      await Hotel.updateOne({ externalId: h.externalId }, h, { upsert: true });
      hotelCount++;
    }
    console.log(`🏨 Upserted ${hotelCount} hotels`);

    // Bookings - only add if collection is empty (or reset was used)
    const existingBookings = await Booking.countDocuments();
    if (existingBookings === 0) {
      await Booking.insertMany(sampleBookings);
      console.log(`📅 Inserted ${sampleBookings.length} bookings`);
    } else {
      console.log(`📅 Skipped bookings (${existingBookings} already exist)`);
    }

    console.log("\n✨ Seed complete!");
  } catch (err) {
    console.error("❌ Seed failed:", err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seed();
