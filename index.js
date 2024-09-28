require("dotenv").config(); // Load environment variables
const express = require("express");
const app = express();
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt"); // To hash passwords
const { MongoClient, ServerApiVersion } = require("mongodb");
const jwt = require("jsonwebtoken");

app.use(cors());
app.use(bodyParser.json());

// MongoDB URI
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ss5j1ke.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    console.log("Connected to MongoDB!");

    const db = client.db("zenWhisper");
    const userCollection = db.collection("users");

    // GET API to fetch all users
    app.get("/users", async (req, res) => {
      const result = await userCollection.find({}).toArray();
      res.send(result);
    });

    //! POST API to create a new user
    app.post("/signup", async (req, res) => {
      const { username, email, password } = req.body;
      console.log(username, email, password);

      if (!username || !email || !password) {
        return res.status(400).json({ message: "All fields are required." });
      }

      // Check if user already exists
      const existingUser = await userCollection.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: "User already exists." });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = { username, email, password: hashedPassword };

      await userCollection.insertOne(newUser);
      res.status(201).json({ message: "User registered successfully." });
    });

    // POST API for login
    app.post("/login", async (req, res) => {
      const { email, password } = req.body;

      if (!email || !password) {
        return res
          .status(400)
          .json({ message: "Email and password are required." });
      }

      const user = await userCollection.findOne({ email });
      if (!user) {
        return res.status(400).json({ message: "Invalid email or password." });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(400).json({ message: "Invalid email or password." });
      }

      const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET, {
        expiresIn: "12h",
      });
      const userInfo = { username: user.username, email: user.email };
      res.json({ message: "Login successful", token, userInfo });
    });
  } catch (err) {
    console.error("MongoDB connection error:", err);
  }
}

run().catch(console.dir);

// Express and Socket.IO setup
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // Adjust the frontend URL if needed
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

io.on("connection", (socket) => {
  const options = {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit", // Two-digit month
    day: "2-digit", // Two-digit day
    hour: "2-digit",
    minute: "2-digit",
    hour12: true, // 12-hour format
  };

  console.log(`User connected: ${socket.id}`);

  // When a user joins a room
  socket.on("join_room", (roomId, username) => {
    socket.join(roomId);
    console.log(`User with ID: ${socket.id} joined room: ${roomId}`);

    // Emit a joining message to all clients in the room
    io.in(roomId).emit("joining_message", {
      author: "System",
      message: `${username} has joined the room.`,
      time: new Date().toLocaleString("en-US", options),
    });
  });

  // When a user sends a message
  socket.on("send_message", (data) => {
    console.log(
      `Message from ${data.author} in room ${data.roomId}: ${data.message}`
    );

    // Broadcast message to all clients in the room, including sender
    io.in(data.roomId).emit("receive_group_message", data);
  });

  // When someone leaves the room
  socket.on("leave_room", (roomId, username) => {
    socket.leave(roomId);
    console.log(`${username} left room: ${roomId}`);

    // Emit a leave message to all clients in the room
    io.in(roomId).emit("leave_message", {
      author: "System",
      message: `${username} has left the room.`,
      time: new Date().toLocaleString("en-US", options),
    });
  });

  // When a user disconnects
  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

// Root route for API
app.get("/", (req, res) => {
  return res.send("Welcome to zenWhisper");
});

// Start the server on the specified port
const PORT = 5000;
server.listen(PORT, () => {
  console.log(`Server is running on PORT: ${PORT}`);
});
