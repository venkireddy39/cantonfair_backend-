import express from "express";
import mysql from "mysql2/promise";
import cors from "cors";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// CORS
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

// MySQL Pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Gmail SMTP
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Test Route
app.get("/", (req, res) => {
  res.send("Backend Running ✅");
});

// Submit Lead
app.post("/api/leads", async (req, res) => {
  const {
    name,
    phone,
    email,
    business_name,
    business_category,
  } = req.body;

  // Validation
  if (
    !name ||
    !phone ||
    !email ||
    !business_name ||
    !business_category
  ) {
    return res.status(400).json({
      success: false,
      error: "All fields are required.",
    });
  }

  try {
    // Save to DB
    const [result] = await pool.execute(
      `INSERT INTO leads
      (name, phone, email, business_name, business_category)
      VALUES (?, ?, ?, ?, ?)`,
      [
        name.trim(),
        phone.trim(),
        email.trim(),
        business_name.trim(),
        business_category.trim(),
      ]
    );

    // Success response
    res.status(200).json({
      success: true,
      message: "Lead submitted successfully",
      id: result.insertId,
    });

    // Send Email
    transporter
      .sendMail({
        from: `"Holidays Navigator Website" <${process.env.EMAIL_USER}>`,
        to: "cantonfairleads@gmail.com",
        subject: "Canton Fair Website — New Lead",

        text: `
Hello Holidays Navigator Team,

You have received a new Canton Fair lead.


Lead Details


Name:  ${name}

Phone: ${phone}

Email ID: ${email}

Business Name: ${business_name}

Business Category: ${business_category}

Please contact this lead.

Regards,
Holidays Navigator Canton Fair Website
        `,
      })
      .then(() => {
        console.log("✅ Email sent successfully");
      })
      .catch((err) => {
        console.error("❌ Email Error:", err);
      });
  } catch (error) {
    console.error("Backend Error:", error);

    res.status(500).json({
      success: false,
      error: "Internal server error",
      details: error.message,
    });
  }
});

// Start Server
const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});