const db = require('../server/db.cjs');

db.run("DELETE FROM queue_entries", (err) => {
    if (err) {
        console.error("Failed to clear queue:", err);
    } else {
        console.log("Queue cleared successfully.");
    }
});
