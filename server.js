const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

/* ✅ DB CONNECTION */
const pool = new Pool({
  connectionString: process.env.DB_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

db.connect(err => {
  if (err) {
    console.log("❌ DB ERROR:", err);
  } else {
    console.log("✅ MySQL Connected");
  }
});

/* ================= AUTH ================= */

/* LOGIN */
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const result = await pool.query(
    "SELECT * FROM users WHERE username=$1 AND password=$2",
    [username, password]
  );

  res.json({ success: result.rows.length > 0 });
});

/* SIGNUP */
app.post("/signup", async (req, res) => {
  const { username, password } = req.body;

  const check = await pool.query(
    "SELECT * FROM users WHERE username=$1",
    [username]
  );

  if (check.rows.length > 0) {
    return res.json({ success: false, message: "User exists" });
  }

  await pool.query(
    "INSERT INTO users(username,password) VALUES($1,$2)",
    [username, password]
  );

  res.json({ success: true });
});

/* ================= STUDENTS ================= */

/* ADD STUDENT */
app.post("/students", async (req, res) => {
  try {
    const { name, email, branch, phone } = req.body;

    // ✅ validation
    if (!name || !email || !branch || !phone) {
      return res.json({ success: false, message: "All fields required" });
    }

    // ✅ insert
    await pool.query(
      "INSERT INTO students(name, email, branch, phone) VALUES($1, $2, $3, $4)",
      [name, email, branch, phone]
    );

    res.json({ success: true });

  } catch (err) {
    console.log("ADD ERROR:", err);
    res.json({ success: false, message: "Server error" });
  }
});
/* GET STUDENTS */
app.get("/students", async (req, res) => {
  const result = await pool.query(
    "SELECT * FROM students ORDER BY id DESC"
  );

  res.json(result.rows);
});

/* DELETE */
app.delete("/students/:id", async (req, res) => {
  await pool.query(
    "DELETE FROM students WHERE id=$1",
    [req.params.id]
  );

  res.json({ success: true });
});

/* EXPORT CSV */
app.get("/export", (req, res) => {
  db.query("SELECT * FROM students", (err, rows) => {
    let csv = "Name,Email,Branch,Phone,Date\n";

    rows.forEach(r => {
      csv += `${r.name},${r.email},${r.branch},${r.phone},${r.created_at}\n`;
    });

    res.header("Content-Type", "text/csv");
    res.attachment("students.csv");
    res.send(csv);
  });
});

/* START */
app.listen(5000, () => {
  console.log("🚀 Server running on port 5000");
});