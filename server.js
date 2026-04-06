const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

/* ✅ DB CONNECTION */
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Varun@0014",
  database: "testdb"
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
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  db.query(
    "SELECT * FROM users WHERE username=? AND password=?",
    [username, password],
    (err, result) => {
      if (err) return res.json({ success: false });

      res.json({ success: result.length > 0 });
    }
  );
});

/* SIGNUP */
app.post("/signup", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.json({ success: false, message: "Fill all fields" });
  }

  db.query("SELECT * FROM users WHERE username=?", [username], (err, result) => {
    if (result.length > 0) {
      return res.json({ success: false, message: "User exists" });
    }

    db.query(
      "INSERT INTO users(username,password) VALUES(?,?)",
      [username, password],
      err => {
        if (err) return res.json({ success: false });

        res.json({ success: true, message: "Signup successful" });
      }
    );
  });
});

/* ================= STUDENTS ================= */

/* ADD STUDENT */
app.post("/students", (req, res) => {
  const { name, email, branch, phone } = req.body;

  if (!name || !email || !branch || !phone) {
    return res.json({ success: false, message: "All fields required" });
  }

  const sql = `
    INSERT INTO students (name, email, branch, phone)
    VALUES (?, ?, ?, ?)
  `;

  db.query(sql, [name, email, branch, phone], (err) => {
    if (err) {
      console.log("❌ DB ERROR:", err);
      return res.json({ success: false, message: "DB error" });
    }

    res.json({ success: true });
  });
});

/* GET STUDENTS */
app.get("/students", (req, res) => {
  db.query("SELECT * FROM students ORDER BY id DESC", (err, result) => {
    if (err) return res.json([]);

    res.json(result);
  });
});

/* DELETE */
app.delete("/students/:id", (req, res) => {
  db.query("DELETE FROM students WHERE id=?", [req.params.id], () =>
    res.json({ success: true })
  );
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