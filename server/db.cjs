const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'queue_system.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database.');
  }
});

db.serialize(() => {
  // Patients Table
  db.run(`CREATE TABLE IF NOT EXISTS patients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    age INTEGER,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Doctors Table
  db.run(`CREATE TABLE IF NOT EXISTS doctors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    room_number TEXT NOT NULL,
    schedule TEXT
  )`);

  // Migration: Add schedule column if not exists (ignoring error if exists)
  db.run("ALTER TABLE doctors ADD COLUMN schedule TEXT", (err) => {
    // Ignore error if column already exists
  });

  // Queue Table
  db.run(`CREATE TABLE IF NOT EXISTS queue_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    doctor_id INTEGER NOT NULL,
    queue_number TEXT NOT NULL,
    status TEXT DEFAULT 'waiting', -- waiting, called, arrived, completed, skipped
    sort_order INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients (id),
    FOREIGN KEY (doctor_id) REFERENCES doctors (id)
  )`);

  // Migration: Add sort_order column if not exists
  db.run("ALTER TABLE queue_entries ADD COLUMN sort_order INTEGER", (err) => {
    // Ignore error if column already exists
  });

  // Seed Doctors if empty
  db.get("SELECT count(*) as count FROM doctors", (err, row) => {
    if (row.count === 0) {
      const stmt = db.prepare("INSERT INTO doctors (name, room_number) VALUES (?, ?)");
      stmt.run("Dr. Smith", "3");
      stmt.run("Dr. Jones", "1");
      stmt.run("Dr. Strange", "2");
      stmt.finalize();
      console.log("Seeded doctors.");
    }
  });
});

module.exports = db;
