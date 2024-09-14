require("dotenv").config(); // Load environment variables
const express = require("express");
const app = express();
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt"); // To hash passwords
const { MongoClient, ServerApiVersion } = require("mongodb");

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

    // POST API to create a new user
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
  } catch (err) {
    console.error("MongoDB connection error:", err);
  }
}

run().catch(console.dir);

// Express and Socket.IO setup
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

app.get("/", (req, res) => {
  return res.send("Welcome to zenWhisper");
});

const PORT = 5000;
server.listen(PORT, () => {
  console.log(`Server is running on PORT: ${PORT}`);
});
