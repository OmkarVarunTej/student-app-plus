const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();

const JWT_SECRET = process.env.JWT_SECRET || "change_this_secret_in_production";

/* ── CORS ── allow your Netlify domain + localhost for dev */
const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:5500",
  /\.netlify\.app$/,          // any *.netlify.app subdomain
];

app.use(cors({
  origin: (origin, callback) => {
    // allow non-browser requests (curl, Render health checks) and listed origins
    if (!origin) return callback(null, true);
    const ok = allowedOrigins.some(o =>
      typeof o === "string" ? o === origin : o.test(origin)
    );
    ok ? callback(null, true) : callback(new Error("CORS blocked: " + origin));
  },
  credentials: true,
}));

app.use(express.json());

/* ── DATABASE ── */
const pool = new Pool({
  connectionString: process.env.DB_URL,
  ssl: { rejectUnauthorized: false },
});

/* ── AUTH MIDDLEWARE ── */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ success: false, message: "Unauthorized" });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
}

/* ── HEALTH ── */
app.get("/health", (_req, res) => res.json({ status: "ok" }));

/* ── LOGIN ── */
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ success: false, message: "Missing fields" });

  try {
    const result = await pool.query(
      "SELECT * FROM users WHERE username = $1",
      [username]
    );

    if (result.rows.length === 0)
      return res.json({ success: false, message: "Invalid credentials" });

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid)
      return res.json({ success: false, message: "Invalid credentials" });

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({ success: true, token, username: user.username });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/* ── SIGNUP ── */
app.post("/signup", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ success: false, message: "Missing fields" });

  try {
    const existing = await pool.query(
      "SELECT id FROM users WHERE username = $1",
      [username]
    );
    if (existing.rows.length > 0)
      return res.json({ success: false, message: "Username already taken" });

    const hashed = await bcrypt.hash(password, 10);
    await pool.query(
      "INSERT INTO users(username, password) VALUES($1, $2)",
      [username, hashed]
    );

    res.json({ success: true, message: "Account created" });
  } catch (err) {
    console.error("SIGNUP ERROR:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/* ── GET STUDENTS (with optional search) ── */
app.get("/students", requireAuth, async (req, res) => {
  const q = (req.query.q || "").trim();
  try {
    let result;
    if (q) {
      result = await pool.query(
        `SELECT * FROM students
         WHERE name ILIKE $1 OR email ILIKE $1 OR branch ILIKE $1
         ORDER BY id DESC`,
        [`%${q}%`]
      );
    } else {
      result = await pool.query("SELECT * FROM students ORDER BY id DESC");
    }
    res.json(result.rows);
  } catch (err) {
    console.error("GET STUDENTS ERROR:", err);
    res.status(500).json([]);
  }
});

/* ── ADD STUDENT ── */
app.post("/students", requireAuth, async (req, res) => {
  const { name, email, branch, phone } = req.body;
  if (!name || !email || !branch || !phone)
    return res.status(400).json({ success: false, message: "All fields required" });

  try {
    const result = await pool.query(
      "INSERT INTO students(name, email, branch, phone) VALUES($1,$2,$3,$4) RETURNING *",
      [name, email, branch, phone]
    );
    res.json({ success: true, student: result.rows[0] });
  } catch (err) {
    console.error("ADD STUDENT ERROR:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/* ── DELETE STUDENT ── */
app.delete("/students/:id", requireAuth, async (req, res) => {
  try {
    await pool.query("DELETE FROM students WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error("DELETE STUDENT ERROR:", err);
    res.status(500).json({ success: false });
  }
});

app.get("/", (_req, res) => res.send("API is running 🚀"));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log("Server running on port " + PORT));
