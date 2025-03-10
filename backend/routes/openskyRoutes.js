const express = require("express");

const router = express.Router();
const OPENSKY_BASE = "https://opensky-network.org/api";

function getAuthHeaders() {
    const username = process.env.OPENSKY_USERNAME;
    const password = process.env.OPENSKY_PASSWORD;
    if (!username || !password) {
        return {};
    }
    const credentials = Buffer.from(`${username}:${password}`).toString(
        "base64",
    );
    return { Authorization: `Basic ${credentials}` };
}

// Proxies any OpenSky path, e.g. /states/all, /tracks/all?icao24=...&time=0
router.use(async (req, res) => {
    const targetUrl = `${OPENSKY_BASE}${req.url}`;

    try {
        const response = await fetch(targetUrl, {
            method: req.method,
            headers: {
                Accept: "application/json",
                ...getAuthHeaders(),
            },
        });

        const contentType = response.headers.get("content-type");
        if (contentType) {
            res.setHeader("Content-Type", contentType);
        }

        const body = await response.text();
        res.status(response.status).send(body);
    } catch (err) {
        console.error("OpenSky proxy error:", err);
        res.status(502).json({ error: "Failed to fetch data from OpenSky" });
    }
});

module.exports = router;
