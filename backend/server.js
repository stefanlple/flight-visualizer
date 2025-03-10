const path = require("path");
const express = require("express");
const dotenv = require("dotenv").config();
const { errorHandler } = require("./middleware/errorMiddleware");
const cors = require("cors");

const app = express();
const port = process.env.PORT || 5001;

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());

// OpenSky proxy (used by realtime / live mode)
app.use("/api/opensky", require("./routes/openskyRoutes.js"));

// DEPRECATED: historical mode + MongoDB — not used for live deployment
// const connectDB = require("./config/db");
// connectDB();
// app.use("/api/flight", require("./routes/flightRoutes.js"));

const distPath = path.join(__dirname, "../dist");
if (process.env.NODE_ENV === "production") {
    app.use(express.static(distPath));
    app.get("*", (req, res, next) => {
        if (req.path.startsWith("/api")) {
            return next();
        }
        res.sendFile(path.join(distPath, "index.html"));
    });
}

app.use(errorHandler);

const server = app.listen(port, () => {
    console.log(`Server started on port ${port}`);
});

server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
        console.error(
            `Port ${port} is already in use. Stop the other process (e.g. lsof -i :${port}) or set PORT in backend/.env.`,
        );
        process.exit(1);
    }
    throw err;
});
