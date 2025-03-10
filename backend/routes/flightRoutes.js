// DEPRECATED: historical mode — served flight data from MongoDB
const express = require("express");
const { getHello, getDataByDate } = require("../controllers/flightController");
const router = express.Router();

router.get("/hello", getHello);
router.get("/data", getDataByDate);
module.exports = router;
