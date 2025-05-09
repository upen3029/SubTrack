const express = require('express');
const cors = require('cors');
const fs = require('fs');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const ensureFileExists = (filePath) => {
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, '{}'); // Create an empty JSON object
    }
};

// Ensure the subscriptions.json file exists
ensureFileExists('subscriptions.json');

// Load subscriptions from JSON file
app.get('/subscriptions', (req, res) => {
    fs.readFile('subscriptions.json', 'utf8', (err, data) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to load data' });
        }

        try {
            const subscriptions = JSON.parse(data || '{}'); // Fallback to an empty object
            res.json(subscriptions);
        } catch (parseError) {
            return res.status(500).json({ error: 'Failed to parse data' });
        }
    });
});

app.get('/', (req, res) => {
    console.log("GET / hit");
    res.send('Welcome to Subscription Manager Backend!');
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

// Save a new subscription to JSON file
app.post('/subscriptions', (req, res) => {
    const newSub = req.body;

    fs.readFile('subscriptions.json', 'utf8', (err, data) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to read data' });
        }

        let subscriptions;
        try {
            subscriptions = JSON.parse(data || '{}'); // Fallback to an empty object
        } catch (parseError) {
            return res.status(500).json({ error: 'Failed to parse data' });
        }

        // Find next available ID
        const ids = Object.keys(subscriptions).map(Number);
        const newId = ids.length > 0 ? Math.max(...ids) + 1 : 1;

        subscriptions[newId] = newSub;

        fs.writeFile('subscriptions.json', JSON.stringify(subscriptions, null, 2), (err) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to save data' });
            }
            res.json({ success: true, id: newId });
        });
    });
});

// Update an existing subscription
app.put('/edit/:id', (req, res) => {
    const subId = req.params.id; // Get the subscription ID from the URL
    const updatedSub = req.body; // Get the updated subscription data from the request body

    // Validate the updated subscription data
    if (!updatedSub || !updatedSub.name || !updatedSub.start_date || !updatedSub.user_id) {
        return res.status(400).json({ error: 'Invalid subscription data' });
    }

    fs.readFile('subscriptions.json', 'utf8', (err, data) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to read data' });
        }

        let subscriptions;
        try {
            subscriptions = JSON.parse(data || '{}'); // Fallback to an empty object
        } catch (parseError) {
            return res.status(500).json({ error: 'Failed to parse data' });
        }

        // Check if the subscription exists
        if (!subscriptions[subId]) {
            return res.status(404).json({ error: 'Subscription not found' });
        }

        // Update the subscription
        subscriptions[subId] = updatedSub;

        // Write the updated subscriptions back to the file
        fs.writeFile('subscriptions.json', JSON.stringify(subscriptions, null, 2), (err) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to update data' });
            }
            res.json({ success: true, message: 'Subscription updated successfully' });
        });
    });
});

// Delete a subscription
app.delete('/subscriptions/:id', (req, res) => {
    const { id } = req.params;

    fs.readFile('subscriptions.json', 'utf8', (err, data) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to read data' });
        }

        const subscriptions = JSON.parse(data);

        if (!subscriptions[id]) {
            return res.status(404).json({ error: 'Subscription not found' });
        }

        // Delete the subscription
        delete subscriptions[id];

        fs.writeFile('subscriptions.json', JSON.stringify(subscriptions, null, 2), (err) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to delete subscription' });
            }
            res.status(200).json({ message: 'Subscription deleted successfully' });
        });
    });
});
