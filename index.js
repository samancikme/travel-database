const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Secret key for JWT
const SECRET_KEY = "your_secret_key";

// JSON fayldan foydalanuvchi ma'lumotlarini olish
function getUsers() {
  const data = fs.readFileSync("./users.json");
  return JSON.parse(data).users;
}

// JSON faylga foydalanuvchi ma'lumotlarini yozish
function saveUsers(users) {
  fs.writeFileSync("./users.json", JSON.stringify({ users }, null, 2));
}

// JSON fayldan post ma'lumotlarini olish
function getDestinations() {
  try {
    const data = fs.readFileSync("./destinations.json");
    return JSON.parse(data).destinations;
  } catch (error) {
    console.error("Error reading destination.json", error);
    return [];
  }
}

// JSON fayldan offers ma'lumotlarini olish
function getOffers() {
  try {
    const data = fs.readFileSync("./offers.json");
    return JSON.parse(data).offers;
  } catch (error) {
    console.error("Error reading offers.json", error);
    return [];
  }
}

// JSON faylga post ma'lumotlarini yozish
function savePosts(destinations) {
  fs.writeFileSync(
    "./destinations.json",
    JSON.stringify({ destinations }, null, 2)
  );
}

// Helper function to create a slug from title
function createSlug(title) {
  return title
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-]/g, "");
}

// Register endpoint (foydalanuvchilarni 'users.json'ga saqlash)
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

// Login endpoint (foydalanuvchilarni autentifikatsiya qilish)
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

// Middleware for protected routes (only for authenticated users)
function authenticateToken(req, res, next) {
  const token = req.headers["authorization"];
  if (!token) return res.sendStatus(401);

  jwt.verify(token.split(" ")[1], SECRET_KEY, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// Public route: Get destinations (registratsiya talab qilinmaydi)
app.get("/destinations", (req, res) => {
  const destinations = getDestinations();
  res.json(destinations);
});

// Public route: Get offers (registratsiya talab qilinmaydi)
app.get("/offers", (req, res) => {
  const offers = getOffers();
  res.json(offers);
});

// Protected route: Create destination (autentifikatsiyadan o'tgan foydalanuvchilar uchun)
app.post("/destinations", authenticateToken, (req, res) => {
  const { name, country, image, description } = req.body;
  const destinations = getDestinations();
  const slug = createSlug(name);
  const today = new Date();
  const formattedDate = today
    .toLocaleDateString("en-GB")
    .split("/")
    .reverse()
    .join("-");

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
  savePosts(destinations);

  res.status(201).json({
    message: "Destination muvaffaqiyatli yaratildi",
    destination: newDestination,
  });
});


// Protected route: Update destination
app.put("/destinations/:id", authenticateToken, (req, res) => {
  let destinations = getDestinations();
  const slug = createSlug(name);
  const destinationId = parseInt(req.params.id);
  const { name, country, image, description , } = req.body;

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
    name,
    slug,
    country,
    image,
    description,
  };

  destinations[destinationIndex] = updatedDestination;
  savePosts(destinations);

  res.status(200).json({
    message: "Destination muvaffaqiyatli yangilandi",
    destination: updatedDestination,
  });
});

// Protected route: Delete destination
app.delete("/destinations/:id", authenticateToken, (req, res) => {
  let destinations = getDestinations();
  const destinationId = parseInt(req.params.id);

  const destinationIndex = destinations.findIndex(
    (destination) =>
      destination.id === destinationId && destination.authorId === req.user.id
  );

  if (destinationIndex === -1) {
    return res
      .status(404)
      .json({ message: "Destination topilmadi yoki sizning emas" });
  }

  destinations.splice(destinationIndex, 1);
  savePosts(destinations);

  res.status(200).json({ message: "Destination muvaffaqiyatli o'chirildi" });
});




// Protected route: Create offer (autentifikatsiyadan o'tgan foydalanuvchilar uchun)
app.post("/offers", authenticateToken, (req, res) => {
  const { title, details, image, rating, price , destinationId} = req.body;
  const offers = getOffers();
  const slug = createSlug(title);
  const today = new Date();
  const formattedDate = today
    .toLocaleDateString("en-GB")
    .split("/")
    .reverse()
    .join("-");

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
  savePosts(offers);

  res
    .status(201)
    .json({ message: "Offer muvaffaqiyatli yaratildi", offer: newOffer });
});

// Protected route: Update offer
app.put("/offers/:id", authenticateToken, (req, res) => {
  let offers = getOffers();
  const offerId = parseInt(req.params.id);
  const { title, details, image, rating, price } = req.body;
  const slug = createSlug(title);
  const offerIndex = offers.findIndex(
    (offer) => offer.id === offerId && offer.authorId === req.user.id
  );

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
  savePosts(offers);

  res
    .status(200)
    .json({ message: "Offer muvaffaqiyatli yangilandi", offer: updatedOffer });
});

// Protected route: Delete offer
app.delete("/offers/:id", authenticateToken, (req, res) => {
  let offers = getOffers();
  const offerId = parseInt(req.params.id);

  const offerIndex = offers.findIndex(
    (offer) => offer.id === offerId && offer.authorId === req.user.id
  );

  if (offerIndex === -1) {
    return res
      .status(404)
      .json({ message: "Offer topilmadi yoki sizning emas" });
  }

  offers.splice(offerIndex, 1);
  savePosts(offers);

  res.status(200).json({ message: "Offer muvaffaqiyatli o'chirildi" });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
