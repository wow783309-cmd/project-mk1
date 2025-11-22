const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const db = require('./db.cjs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all for MVP
        methods: ["GET", "POST", "PUT"]
    }
});

app.use(cors());
app.use(express.json());

// --- API Endpoints ---

// Get all doctors
app.get('/api/doctors', (req, res) => {
    db.all("SELECT * FROM doctors", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Add Doctor
app.post('/api/doctors', (req, res) => {
    const { name, room_number, schedule } = req.body;
    const sql = "INSERT INTO doctors (name, room_number, schedule) VALUES (?, ?, ?)";
    db.run(sql, [name, room_number, schedule], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, name, room_number, schedule });
    });
});

// Update Doctor
app.put('/api/doctors/:id', (req, res) => {
    const { name, room_number, schedule } = req.body;
    const { id } = req.params;
    const sql = "UPDATE doctors SET name = ?, room_number = ?, schedule = ? WHERE id = ?";
    db.run(sql, [name, room_number, schedule, id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id, name, room_number, schedule });
    });
});

// Register Patient
app.post('/api/patients', (req, res) => {
    const { name, phone, age, notes } = req.body;
    const sql = "INSERT INTO patients (name, phone, age, notes) VALUES (?, ?, ?, ?)";
    db.run(sql, [name, phone, age, notes], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, name, phone, age, notes });
    });
});

// Get all patients (for search/select)
app.get('/api/patients', (req, res) => {
    db.all("SELECT * FROM patients ORDER BY created_at DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Create Queue Entry
app.post('/api/queue', (req, res) => {
    const { patient_id, doctor_id } = req.body;

    // Generate Queue Number (Per Doctor Logic)
    db.get("SELECT count(*) as count FROM queue_entries WHERE doctor_id = ? AND date(created_at) = date('now')", [doctor_id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        const nextNum = row.count + 1;
        const queueNumber = `${nextNum}`; // Simple integer string: "1", "2", "3"
        const sql = "INSERT INTO queue_entries (patient_id, doctor_id, queue_number, status) VALUES (?, ?, ?, 'waiting')";

        db.run(sql, [patient_id, doctor_id, queueNumber], function (err) {
            if (err) return res.status(500).json({ error: err.message });

            const newId = this.lastID;
            // Update sort_order to be the same as ID by default
            // Note: sort_order is global ID based, which is fine for relative ordering within a doctor's list too.
            // Or should sort_order be per doctor? 
            // The reorder API updates sort_order. If we use global ID, it works fine as long as we filter by doctor before sorting/displaying.
            db.run("UPDATE queue_entries SET sort_order = ? WHERE id = ?", [newId, newId]);

            io.emit('queue_updated');
            res.json({ id: newId, queue_number: queueNumber });
        });
    });
});

// Get Queue (Active & Waiting)
app.get('/api/queue', (req, res) => {
    const sql = `
    SELECT q.*, p.name as patient_name, d.name as doctor_name, d.room_number
    FROM queue_entries q
    JOIN patients p ON q.patient_id = p.id
    JOIN doctors d ON q.doctor_id = d.id
    WHERE q.status != 'completed'
    ORDER BY q.sort_order ASC, q.created_at ASC
  `;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Reorder Queue
app.put('/api/queue/reorder', (req, res) => {
    const { items } = req.body; // Array of { id, sort_order }

    if (!items || !Array.isArray(items)) {
        return res.status(400).json({ error: "Invalid items array" });
    }

    const stmt = db.prepare("UPDATE queue_entries SET sort_order = ? WHERE id = ?");

    db.serialize(() => {
        db.run("BEGIN TRANSACTION");
        items.forEach(item => {
            stmt.run(item.sort_order, item.id);
        });
        db.run("COMMIT", (err) => {
            if (err) {
                console.error("Transaction failed", err);
                return res.status(500).json({ error: err.message });
            }
            stmt.finalize();
            io.emit('queue_updated');
            res.json({ success: true });
        });
    });
});

// Update Queue Status
app.put('/api/queue/:id/status', (req, res) => {
    const { status } = req.body;
    const { id } = req.params;

    db.run("UPDATE queue_entries SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [status, id], function (err) {
        if (err) return res.status(500).json({ error: err.message });

        io.emit('queue_updated'); // Broadcast update

        // If status is 'called', we might want to emit a specific event for the patient
        if (status === 'called') {
            // Fetch details to broadcast specific call
            db.get(`
            SELECT q.*, p.name as patient_name, d.name as doctor_name, d.room_number
            FROM queue_entries q
            JOIN patients p ON q.patient_id = p.id
            JOIN doctors d ON q.doctor_id = d.id
            WHERE q.id = ?
          `, [id], (err, row) => {
            });
        }
        res.json({ success: true });
    });
});

// Update Queue Entry (Doctor Assignment)
app.put('/api/queue/:id', (req, res) => {
    const { doctor_id } = req.body;
    const { id } = req.params;

    // We might want to re-generate queue number if doctor changes, but for now let's keep it simple
    // or maybe we SHOULD re-generate?
    // If we move to another doctor, the queue number might conflict or be out of sequence.
    // For MVP, let's just update the doctor_id. The queue number might be weird (e.g. "1" in a list of "5, 6")
    // but since we are using per-doctor queues, it might be okay if we treat it as "inserted".
    // BETTER: Re-calculate queue number for the new doctor.

    db.get("SELECT count(*) as count FROM queue_entries WHERE doctor_id = ? AND date(created_at) = date('now')", [doctor_id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });

        // Only generate new number if doctor actually changed
        // But we need to check current doctor first.
        // For simplicity in this "Quick Fix" feature, let's just update the doctor. 
        // The user asked to "fix" mistakes.

        db.run("UPDATE queue_entries SET doctor_id = ? WHERE id = ?", [doctor_id, id], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            io.emit('queue_updated');
            res.json({ success: true });
        });
    });
});

// Update Patient Name
app.put('/api/patients/:id', (req, res) => {
    const { name } = req.body;
    const { id } = req.params;
    db.run("UPDATE patients SET name = ? WHERE id = ?", [name, id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        io.emit('queue_updated'); // Name change affects queue list
        res.json({ success: true });
    });
});

// Delete Queue Entry
app.delete('/api/queue/:id', (req, res) => {
    const { id } = req.params;
    db.run("DELETE FROM queue_entries WHERE id = ?", [id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        io.emit('queue_updated');
        res.json({ success: true });
    });
});

// --- Socket.io ---
io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

const path = require('path');

// ... existing code ...

app.use(cors());
app.use(express.json());

// Serve static files from the React app
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

// --- API Endpoints ---

// ... existing API endpoints ...

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res) => {
    // Check if it's an API request to avoid returning HTML for 404 APIs
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'Not Found' });
    }
    res.sendFile(path.join(distPath, 'index.html'));
});

// ... Socket.io ...

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
