const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const DATA_FILE = path.join(__dirname, 'events.json');

function readEvents() {
    try {
        const raw = fs.readFileSync(DATA_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        if (!parsed || !Array.isArray(parsed.events)) {
            return { events: [] };
        }
        return parsed;
    } catch (error) {
        return { events: [] };
    }
}

function writeEvents(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// Initialize file if it doesn't exist
if (!fs.existsSync(DATA_FILE)) {
    writeEvents({ events: [] });
}

// Log event
app.post('/api/events', (req, res) => {
    const data = readEvents();
    
    const event = {
        event_id: generateUUID(),
        ...req.body,
        timestamp: new Date().toISOString()
    };
    
    data.events.push(event);
    writeEvents(data);
    
    res.json(event);
});

// Get recent events
app.get('/api/events/recent', (req, res) => {
    const data = readEvents();
    const hours = Math.max(1, parseInt(req.query.hours, 10) || 24);
    
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - hours);
    
    const recent = data.events.filter(e => new Date(e.timestamp) > cutoff);
    res.json(recent);
});

// Export to CSV
app.get('/api/events/export', (req, res) => {
    const data = readEvents();
    
    // Convert to CSV
    let csv = 'Event ID,Type,Battery,Latitude,Longitude,Timestamp\n';
    
    data.events.forEach(e => {
        const lat = e.latitude ?? (e.last_coord && e.last_coord.lat) ?? '';
        const lng = e.longitude ?? (e.last_coord && e.last_coord.lng) ?? '';
        csv += `${e.event_id},${e.trigger_type},${e.battery_level},${lat},${lng},${e.timestamp}\n`;
    });
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=events.csv');
    res.send(csv);
});

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

app.listen(PORT, () => {
    console.log(`✅ Simple server running on http://localhost:${PORT}`);
});
