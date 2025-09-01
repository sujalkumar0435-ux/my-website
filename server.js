// server.js
const express = require("express");
const path = require("path");
const session = require("express-session");
const fs = require("fs");
const nodemailer = require("nodemailer");
require("dotenv").config();

const app = express();
const PORT = 4000;

// Middleware
app.use(express.static(path.join(__dirname, "public"))); // serve public folder
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(
  session({
    secret: "web_secret_key",
    resave: false,
    saveUninitialized: true,
  })
);


// Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

// Helper function to send email
async function sendEmail(to, subject, html) {
  try {
    await transporter.sendMail({ from: process.env.GMAIL_USER, to, subject, html });
    console.log(`✅ Email sent to ${to}`);
  } catch (err) {
    console.error("❌ Email failed:", err);
  }
}



// Routes

// Home page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/contactus.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "contactus.html"));
});

// Register page
app.get("/register.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "register.html"));
});

// OTP page
app.get("/otp.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "otp.html"));
});

// Login page
app.get("/login.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

// -------------------- REGISTRATION -------------------- //
app.post("/register", async (req, res) => {
  const { name, email, password } = req.body;

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000);

  // Store OTP and user in session
  req.session.otp = otp;
  req.session.user = { name, email, password };

  // Send OTP via email
  await sendEmail(email, "Your OTP ✅", `<p>Hello ${name}, your OTP is <b>${otp}</b></p>`);

  res.redirect("/otp.html"); // redirect to OTP page
});

// Verify OTP
app.post("/verify-otp", (req, res) => {
  const { otp } = req.body;
  const sessionOtp = req.session.otp;
  const user = req.session.user;

  if (!user) {
    return res.send("<h2>❌ Session expired. Please register again.</h2><a href='/register.html'>Register</a>");
  }

  if (parseInt(otp) === sessionOtp) {
    // Save user to users.json
    const filePath = path.join(__dirname, "users.json");
    let users = [];
    if (fs.existsSync(filePath)) users = JSON.parse(fs.readFileSync(filePath, "utf-8"));

    users.push(user);
    fs.writeFileSync(filePath, JSON.stringify(users, null, 2));

    req.session.destroy(); // Clear session

    res.send("<h2>✅ Registration successful!</h2><a href='/login.html'>Login here</a>");
  } else {
    res.send("<h2>❌ Invalid OTP</h2><a href='/register.html'>Try Again</a>");
  }
});

// -------------------- LOGIN -------------------- //
app.post("/login", (req, res) => {
  const { email, password } = req.body;
  const filePath = path.join(__dirname, "users.json");
  let users = [];
  if (fs.existsSync(filePath)) users = JSON.parse(fs.readFileSync(filePath, "utf-8"));

  const user = users.find(u => u.email === email && u.password === password);

  if (user) {
    req.session.user = user; // store user session
    res.send(`<h2>✅ Login successful! Welcome ${user.name}</h2><a href='/index.html'>Go to Home</a>`);
  } else {
    res.send("<h2>❌ Invalid email or password</h2><a href='/login.html'>Try Again</a>");
  }
});

// -------------------- CONTACT FORM -------------------- //
app.post("/contactus", async (req, res) => {
  const { name, email, message } = req.body;
  const filePath = path.join(__dirname, "contactus.json");
  let data = [];

  if (fs.existsSync(filePath)) {
    const fileContent = fs.readFileSync(filePath, "utf-8");
    if (fileContent.length > 0) data = JSON.parse(fileContent);
  }

  const date = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata", hour12: false });
  data.push({ name, email, message, date });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

  // Send confirmation email
  await sendEmail(
    email,
    "Form Submission Received ✅",
    `<p>Hello <b>${name}</b>, we received your message at ${date}.</p>
     <p>Your message: ${message}</p>`
  );

  res.send("<h2>✅ Details saved and email sent!</h2><a href='/index.html'>Go Back</a>");
});



// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
