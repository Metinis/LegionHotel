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
  // Paris
  { externalId: "PAR-001", name: "Le Grand Boulevard", city: "PAR", country: "FR",
    address: "12 Rue de Rivoli, Paris", pricePerNight: 245, rating: 4.7,
    amenities: ["Wi-Fi", "Spa", "Breakfast", "Pool"],
    imageUrl: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600" },
  { externalId: "PAR-002", name: "Hôtel Montmartre", city: "PAR", country: "FR",
    address: "8 Place du Tertre, Paris", pricePerNight: 165, rating: 4.3,
    amenities: ["Wi-Fi", "Breakfast"],
    imageUrl: "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=600" },

  // New York
  { externalId: "NYC-001", name: "Times Square Stay", city: "NYC", country: "US",
    address: "234 W 42nd St, New York", pricePerNight: 320, rating: 4.5,
    amenities: ["Wi-Fi", "Gym", "Bar", "Parking"],
    imageUrl: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=600" },
  { externalId: "NYC-002", name: "Brooklyn Bridge Inn", city: "NYC", country: "US",
    address: "55 Front St, Brooklyn", pricePerNight: 210, rating: 4.2,
    amenities: ["Wi-Fi", "Breakfast", "Pet friendly"],
    imageUrl: "https://images.unsplash.com/photo-1444201983204-c43cbd584d93?w=600" },

  // London
  { externalId: "LON-001", name: "The Westminster", city: "LON", country: "GB",
    address: "20 Buckingham Gate, London", pricePerNight: 280, rating: 4.6,
    amenities: ["Wi-Fi", "Spa", "Restaurant"],
    imageUrl: "https://images.unsplash.com/photo-1455587734955-081b22074882?w=600" },
  { externalId: "LON-002", name: "Camden Loft", city: "LON", country: "GB",
    address: "10 Camden High St, London", pricePerNight: 130, rating: 4.0,
    amenities: ["Wi-Fi", "Kitchen"],
    imageUrl: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600" },

  // Madrid
  { externalId: "MAD-001", name: "Hotel Sol Madrid", city: "MAD", country: "ES",
    address: "Puerta del Sol 5, Madrid", pricePerNight: 145, rating: 4.4,
    amenities: ["Wi-Fi", "Breakfast", "Rooftop bar"],
    imageUrl: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=600" },
  { externalId: "MAD-002", name: "Retiro Park Suites", city: "MAD", country: "ES",
    address: "Calle de Alcalá 100, Madrid", pricePerNight: 195, rating: 4.5,
    amenities: ["Wi-Fi", "Pool", "Gym"],
    imageUrl: "https://images.unsplash.com/photo-1551918120-9739cb430c6d?w=600" },

  // Tokyo
  { externalId: "TYO-001", name: "Shibuya Sky Hotel", city: "TYO", country: "JP",
    address: "1-2-3 Shibuya, Tokyo", pricePerNight: 220, rating: 4.6,
    amenities: ["Wi-Fi", "Onsen", "Restaurant"],
    imageUrl: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=600" },
  { externalId: "TYO-002", name: "Asakusa Ryokan", city: "TYO", country: "JP",
    address: "2-15 Asakusa, Taito", pricePerNight: 175, rating: 4.4,
    amenities: ["Wi-Fi", "Traditional bath", "Breakfast"],
    imageUrl: "https://images.unsplash.com/photo-1480796927426-f609979314bd?w=600" },

  // Rome
  { externalId: "ROM-001", name: "Trastevere Boutique", city: "ROM", country: "IT",
    address: "Via della Lungara 12, Rome", pricePerNight: 185, rating: 4.5,
    amenities: ["Wi-Fi", "Breakfast", "Garden"],
    imageUrl: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=600" },

  // Barcelona
  { externalId: "BCN-001", name: "Gaudí Suites", city: "BCN", country: "ES",
    address: "Passeig de Gràcia 50, Barcelona", pricePerNight: 200, rating: 4.6,
    amenities: ["Wi-Fi", "Rooftop pool", "Bar"],
    imageUrl: "https://images.unsplash.com/photo-1583422409516-2895a77efded?w=600" },

  // Berlin
  { externalId: "BER-001", name: "Mitte Modern Hotel", city: "BER", country: "DE",
    address: "Friedrichstraße 100, Berlin", pricePerNight: 155, rating: 4.3,
    amenities: ["Wi-Fi", "Gym", "Bar"],
    imageUrl: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600" },
];

const sampleBookings = [
  {
    guestName: "Daniel Alvarado", guestEmail: "dalvarad@umd.edu",
    hotelName: "Le Grand Boulevard", city: "PAR",
    checkIn: new Date("2026-06-15"), checkOut: new Date("2026-06-18"),
    guests: 2, totalPrice: 735, status: "confirmed",
  },
  {
    guestName: "Maria Santos", guestEmail: "msantos@example.com",
    hotelName: "Times Square Stay", city: "NYC",
    checkIn: new Date("2026-07-01"), checkOut: new Date("2026-07-05"),
    guests: 1, totalPrice: 1280, status: "confirmed",
  },
  {
    guestName: "John Doe", guestEmail: "jdoe@example.com",
    hotelName: "Camden Loft", city: "LON",
    checkIn: new Date("2026-05-20"), checkOut: new Date("2026-05-22"),
    guests: 2, totalPrice: 260, status: "cancelled",
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

    let hotelCount = 0;
    for (const h of sampleHotels) {
      await Hotel.updateOne({ externalId: h.externalId }, h, { upsert: true });
      hotelCount++;
    }
    console.log(`🏨 Upserted ${hotelCount} hotels`);

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
