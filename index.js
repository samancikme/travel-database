const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const app = express();
const port = process.env.PORT || 3000;
const http = require("http");
const socketIo = require("socket.io");
const server = http.createServer(app);
const io = socketIo(server);

app.use(cors());
app.use(bodyParser.json());




const SECRET_KEY = "your_secret_key";
const SECRET_PASSWORD = "123456";





async function getBookings() {
  try {
    const data = await fsPromises.readFile("./bookings.json");
    return JSON.parse(data).bookings;
  } catch (error) {
    console.error("Error reading bookings.json", error);
    return [];
  }
}

async function saveBookings(bookings) {
  try {
    await fsPromises.writeFile("./bookings.json", JSON.stringify({ bookings }, null, 2));
  } catch (error) {
    console.error("Error writing bookings.json", error);
  }
}


















app.post("/admin/login", (req, res) => {
  const { password } = req.body;

  const isValidPassword = bcrypt.compareSync(password, bcrypt.hashSync("123456", 10)); 
  if (!isValidPassword) return res.status(401).json({ message: "Parol noto‘g‘ri" });

  const token = jwt.sign({ admin: true }, SECRET_PASSWORD, { expiresIn: "1h" });
  res.status(200).json({ message: "Admin muvaffaqiyatli kirdi", token });
});
















function authenticateAdmin(req, res, next) {
  const token = req.headers.authorization;
  if (!token) return res.sendStatus(401);

  jwt.verify(token.split(" ")[1], SECRET_PASSWORD, (err, decoded) => {
    if (err) return res.sendStatus(403);
    if (!decoded.admin) return res.sendStatus(403);
    next();
  });
}






















function getUsers() {
  const data = fs.readFileSync("./users.json");
  return JSON.parse(data).users;
}




function saveUsers(users) {
  fs.writeFileSync("./users.json", JSON.stringify({ users }, null, 2));
}






















function getDestinations() {
  try {
    const data = fs.readFileSync("./destinations.json");
    return JSON.parse(data).destinations;
  } catch (error) {
    console.error("Error reading destinations.json", error);
    return [];
  }
}





function saveDestinations(destinations) {
  fs.writeFileSync(
    "./destinations.json",
    JSON.stringify({ destinations }, null, 2)
  );
}






























function getOffers() {
  try {
    const data = fs.readFileSync("./offers.json");
    return JSON.parse(data).offers;
  } catch (error) {
    console.error("Error reading offers.json", error);
    return [];
  }
}



function saveOffers(offers) {
  fs.writeFileSync("./offers.json", JSON.stringify({ offers }, null, 2));
}










function createSlug(title) {
  return title
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-]/g, "");
}

























app.post("/register", (req, res) => {
  const { username, email, password } = req.body;
  const users = getUsers();

  if (users.some((user) => user.email === email)) {
    return res.status(400).json({ message: "Email allaqachon mavjud" });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  const newUser = {
    id: users.length + 1,
    username,
    email,
    password: hashedPassword,
  };

  users.push(newUser);
  saveUsers(users);

  res
    .status(201)
    .json({ message: "Foydalanuvchi muvaffaqiyatli ro'yxatdan o'tdi" });
});


















app.post("/login", (req, res) => {
  const { email, password } = req.body;
  const users = getUsers();

  const user = users.find((user) => user.email === email);
  if (!user) {
    return res.status(400).json({ message: "Email yoki parol xato" });
  }

  const isPasswordValid = bcrypt.compareSync(password, user.password);
  if (!isPasswordValid) {
    return res.status(400).json({ message: "Email yoki parol xato" });
  }

  const token = jwt.sign({ id: user.id, email: user.email }, SECRET_KEY, {
    expiresIn: "1h",
  });
  res.status(200).json({ message: "Kirish muvaffaqiyatli", token });
});




















function authenticateToken(req, res, next) {
  const token = req.headers["authorization"];
  if (!token) return res.sendStatus(401);

  jwt.verify(token.split(" ")[1], SECRET_KEY, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}
















app.get("/destinations", (req, res) => {
  const lang = req.query.lang || 'en'; 
  const destinations = getDestinations();

  const localizedDestinations = destinations.map(destination => {
    return {
      ...destination,
      name: destination.name[lang],
      country : destination.country[lang],
      description: destination.description[lang],
    };
  });

  res.json(localizedDestinations);
});



















app.get("/offers", (req, res) => {
  const lang = req.query.lang || 'en';
  const offers = getOffers();
  const localizedOffers = offers.map(offer => {
    return {
      ...offer,
      title: offer.title[lang],
      details : offer.details[lang]
    };
  });

  res.json(localizedOffers);
});



























app.post("/destinations", authenticateToken, (req, res) => {
  const { name, country, image, description } = req.body;
  const destinations = getDestinations();
  const slug = createSlug(name);
  const today = new Date();
  const formattedDate = today.toISOString().split("T")[0];

  const newDestination = {
    id: destinations.length + 1,
    name,
    slug,
    country,
    image,
    description,
    authorId: req.user.id,
    createdAt: formattedDate,
  };

  destinations.push(newDestination);
  saveDestinations(destinations);

  res
    .status(201)
    .json({
      message: "Destination muvaffaqiyatli yaratildi",
      destination: newDestination,
    });
});


























app.put("/destinations/:id", authenticateToken, async (req, res) => {
  let destinations = getDestinations();
  const destinationId = parseInt(req.params.id);
  const { name, country, image, description } = req.body;

  const destinationIndex = destinations.findIndex(
    (destination) =>
      destination.id === destinationId && destination.authorId === req.user.id
  );

  if (destinationIndex === -1) {
    return res
      .status(404)
      .json({ message: "Destination topilmadi yoki sizning emas" });
  }
 
  const updatedDestination = {
    ...destinations[destinationIndex],
    image,
    name,
    country,
    description,
  };

  destinations[destinationIndex] = updatedDestination;
  saveDestinations(destinations);

  res.status(200).json({
    message: "Destination muvaffaqiyatli yangilandi",
    destination: updatedDestination,
  });
});



























app.delete("/destinations/:id", authenticateToken, (req, res) => {
  let destinations = getDestinations();
  const destinationId = parseInt(req.params.id);

  const destinationIndex = destinations.findIndex(
    (destination) => destination.id === destinationId );

  if (destinationIndex === -1) {
    return res
      .status(404)
      .json({ message: "Destination topilmadi yoki sizning emas" });
  }

  destinations.splice(destinationIndex, 1);
  saveDestinations(destinations);

  res.status(200).json({ message: "Destination muvaffaqiyatli o'chirildi" });
});

















app.post("/offers", authenticateToken, (req, res) => {
  const { title, details, image, rating, price, destinationId } = req.body;
  const offers = getOffers();
  const slug = createSlug(title);
  const today = new Date();
  const formattedDate = today.toISOString().split("T")[0];

  const newOffer = {
    id: offers.length + 1,
    title,
    slug,
    details,
    image,
    rating,
    price,
    destinationId,
    CreatedUserId: req.user.id,
    createdAt: formattedDate,
  };

  offers.push(newOffer);
  saveOffers(offers);

  res
    .status(201)
    .json({ message: "Offer muvaffaqiyatli yaratildi", offer: newOffer });
});
















app.put("/offers/:id", authenticateToken, (req, res) => {
  let offers = getOffers();
  const offerId = parseInt(req.params.id);
  const { title, details, image, rating, price } = req.body;
  const slug = createSlug(title);

  const offerIndex = offers.findIndex((offer) => offer.id === offerId );

  if (offerIndex === -1) {
    return res
      .status(404)
      .json({ message: "Offer topilmadi yoki sizning emas" });
  }

  const updatedOffer = {
    ...offers[offerIndex],
    title,
    slug,
    details,
    image,
    rating,
    price,
  };

  offers[offerIndex] = updatedOffer;
  saveOffers(offers);

  res
    .status(200)
    .json({ message: "Offer muvaffaqiyatli yangilandi", offer: updatedOffer });
});


















app.delete("/offers/:id", authenticateToken, (req, res) => {
  let offers = getOffers();
  const offerId = parseInt(req.params.id);

  const offerIndex = offers.findIndex(
    (offer) => offer.id === offerId && offer.CreatedUserId === req.user.id
  );

  if (offerIndex === -1) {
    return res
      .status(404)
      .json({ message: "Offer topilmadi yoki sizning emas" });
  }

  offers.splice(offerIndex, 1);
  saveOffers(offers);

  res.status(200).json({ message: "Offer muvaffaqiyatli o'chirildi" });
});













io.on("connection", socket => {
  console.log("Foydalanuvchi ulanmoqda");

  socket.on("disconnect", () => {
    console.log("Foydalanuvchi uzildi");
  });
});















app.get("/admin/dashboard", authenticateAdmin, (req, res) => {
  const bookings = getBookings();
  res.status(200).json({ bookings });
});










app.post("/book", authenticateToken, (req, res) => {
  const { name, email, phone, startDate, endDate, tourId } = req.body;

  const bookings = getBookings();
  const newBooking = {
    id: bookings.length + 1,
    name,
    email,
    phone,
    startDate,
    endDate,
    tourId,
    status: "pending",
    userId: req.user.id, 
  };

  bookings.push(newBooking);
  saveBookings(bookings);
  io.emit("new-booking", newBooking);
  res.status(201).json({ message: "Buyurtma qabul qilindi", booking: newBooking });
});







app.put("/admin/bookings/:id", authenticateAdmin, (req, res) => {
  const bookingId = parseInt(req.params.id);
  const { status } = req.body;
  let bookings = getBookings();

  const bookingIndex = bookings.findIndex(booking => booking.id === bookingId);
  if (bookingIndex === -1) return res.status(404).json({ message: "Buyurtma topilmadi" });

  bookings[bookingIndex].status = status;
  saveBookings(bookings);

  // Real-time javob yuborish
  io.emit("booking-status-update", { id: bookingId, status });

  res.status(200).json({ message: `Buyurtma ${status} qilindi` });
});







app.listen(port, () => {
  console.log(`Server ${port}-portda ishga tushdi`);
});
