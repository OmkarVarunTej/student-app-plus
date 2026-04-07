const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

/* ✅ SUPABASE CONNECTION */
const pool = new Pool({
  connectionString: process.env.DB_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

app.get("/test", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM users");
    res.json(result.rows);
  } catch (err) {
    console.log(err);
    res.send("DB ERROR");
  }
});
/* ================= AUTH ================= */

/* LOGIN */
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await pool.query(
      "SELECT * FROM users WHERE username=$1 AND password=$2",
      [username, password]
    );

    console.log("LOGIN RESULT:", result.rows);

    if (result.rows.length > 0) {
      res.json({ success: true });
    } else {
      res.json({ success: false });
    }

  } catch (err) {
    console.log("LOGIN ERROR:", err);
    res.json({ success: false });
  }
});
/* SIGNUP */
app.post("/signup", async (req, res) => {
  let { username, password } = req.body;

  username = username.trim();
  password = password.trim();

  if (!username || !password) {
    return res.json({ success: false });
  }

  try {
    await pool.query(
      "INSERT INTO users(username,password) VALUES($1,$2)",
      [username, password]
    );

    res.json({ success: true });

  } catch (err) {
    console.log(err);
    res.json({ success: false });
  }
});
/* ================= STUDENTS ================= */

/* ADD STUDENT */
app.post("/students", async (req, res) => {
  const { name, email, branch, phone } = req.body;

  if (!name || !email || !branch || !phone) {
    return res.json({ success: false, message: "All fields required" });
  }

  try {
    await pool.query(
      "INSERT INTO students(name,email,branch,phone) VALUES($1,$2,$3,$4)",
      [name, email, branch, phone]
    );

    res.json({ success: true });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false });
  }
});

/* GET STUDENTS */
app.get("/students", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM students ORDER BY id DESC"
    );
    res.json(result.rows);
  } catch (err) {
    console.log(err);
    res.json([]);
  }
});

/* DELETE */
app.delete("/students/:id", async (req, res) => {
  try {
    await pool.query(
      "DELETE FROM students WHERE id=$1",
      [req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false });
  }
});

/* ================= START ================= */

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("🚀 Server running");
});