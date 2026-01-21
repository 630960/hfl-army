const express = require("express");
const fs = require("fs");
const path = require("path");
const session = require("express-session");
const XLSX = require("xlsx");

const app = express();
const PORT = 3000;

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

/* ===== SESSION SETUP ===== */
app.use(session({
  secret: "hflarmy_secret_key",
  resave: false,
  saveUninitialized: true,
}));

/* ===== SIMPLE ADMIN CREDENTIALS ===== */
const ADMIN_USER = "admin";
const ADMIN_PASS = "1234";

/* ===== DATA PATH ===== */
const dataDir = path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

const soloFile = path.join(dataDir, "solo.json");
const duoFile = path.join(dataDir, "duo.json");
const squadFile = path.join(dataDir, "squad.json");

/* ===== HELPERS ===== */
function readData(file) {
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, "utf-8"));
}

function saveData(file, data) {
  const arr = readData(file);
  arr.push(data);
  fs.writeFileSync(file, JSON.stringify(arr, null, 2));
}

/* ===== LOGIN ROUTE ===== */
app.post("/admin/login", (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    req.session.isAdmin = true;
    res.json({ success: true });
  } else {
    res.json({ success: false });
  }
});

/* ===== PROTECT ADMIN PANEL ===== */
function adminOnly(req, res, next) {
  if (req.session.isAdmin) next();
  else res.status(403).json({ error: "Not authorized" });
}

/* ===== SERVE ADMIN PANEL SECURELY ===== */
app.get("/admin.html", adminOnly, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

/* ===== SAVE ROUTES ===== */
app.post("/solo", (req, res) => { saveData(soloFile, req.body); res.json({ success:true }); });
app.post("/duo", (req, res) => { saveData(duoFile, req.body); res.json({ success:true }); });
app.post("/squad", (req, res) => { saveData(squadFile, req.body); res.json({ success:true }); });

/* ===== ADMIN DATA ROUTES ===== */
app.get("/admin/solo", adminOnly, (req, res) => { res.json(readData(soloFile)); });
app.get("/admin/duo", adminOnly, (req, res) => { res.json(readData(duoFile)); });
app.get("/admin/squad", adminOnly, (req, res) => { res.json(readData(squadFile)); });

/* ===== DELETE ROUTE ===== */
app.delete("/admin/delete/:type/:index", adminOnly, (req, res) => {
  const { type, index } = req.params;
  let file;
  if (type === "solo") file = soloFile;
  else if (type === "duo") file = duoFile;
  else if (type === "squad") file = squadFile;
  else return res.status(400).json({ success:false, error:"Invalid type" });

  const arr = readData(file);
  if (index < 0 || index >= arr.length) return res.status(400).json({ success:false, error:"Invalid index" });

  arr.splice(index, 1);
  fs.writeFileSync(file, JSON.stringify(arr, null, 2));
  res.json({ success:true });
});

/* ===== EDIT ROUTE ===== */
app.put("/admin/edit/:type/:index", adminOnly, (req, res) => {
  const { type, index } = req.params;
  let file;
  if (type === "solo") file = soloFile;
  else if (type === "duo") file = duoFile;
  else if (type === "squad") file = squadFile;
  else return res.status(400).json({ success:false, error:"Invalid type" });

  const arr = readData(file);
  if (index < 0 || index >= arr.length) return res.status(400).json({ success:false, error:"Invalid index" });

  arr[index] = req.body;
  fs.writeFileSync(file, JSON.stringify(arr, null, 2));
  res.json({ success:true });
});

/* ===== EXPORT TO EXCEL ===== */
app.get("/admin/export", adminOnly, (req, res) => {
  const workbook = XLSX.utils.book_new();

  // SOLO
  const soloData = readData(soloFile);
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(soloData), "SOLO");

  // DUO
  const duoData = readData(duoFile);
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(duoData), "DUO");

  // SQUAD
  const squadData = readData(squadFile);
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(squadData), "SQUAD");

  const filePath = path.join(dataDir, "HFL-Registrations.xlsx");
  XLSX.writeFile(workbook, filePath);

  res.download(filePath, "HFL-Registrations.xlsx");
});

/* ===== LOGOUT ===== */
app.get("/admin/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/admin-login.html");
});

/* ===== START SERVER ===== */
app.listen(PORT, () => {
  console.log(`Server running: http://localhost:${PORT}`);
  console.log(`Admin login: http://localhost:${PORT}/admin-login.html`);
});
