const fetch = require('node-fetch');

module.exports = async (req, res) => {
    // Handle CORS preflight request (OPTIONS)
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type');
        res.status(204).send('');
        return;
    }

    // Handle the actual request
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: "URL is required" });

    try {
        const response = await fetch(url);
        const text = await response.text();
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.send(text);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
