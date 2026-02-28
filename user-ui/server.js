const express = require("express");
const axios = require("axios");
const { Pool } = require("pg");

const app = express();
app.use(express.json());

const PORT = 5000;

const CSMS_URL = "https://your-csms-url";
const CHARGER_ID = "250822008C06";
const TENANT_ID = 1;

const pool = new Pool({
  user: "citrine",
  host: "localhost",
  database: "citrine",
  password: "citrine",
  port: 5432,
});

// Battery Config
const BATTERY_PACKS = {
  Classic: 30,
  Pro: 60,
  Max: 90
};

// 1Ah = 2.7km
const RANGE_PER_AH = 2.7;

app.post("/auto-charge", async (req, res) => {
  try {
    const { vin, desiredRange } = req.body;

    // 🔹 1. Get vehicle data from DB
    const result = await pool.query(
      "SELECT data FROM vehicledata WHERE data->>'vin' = $1 ORDER BY id DESC LIMIT 1",
      [vin]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    const vehicle = result.rows[0].data;
    const soc = vehicle.soc;
    const model = vehicle.model;

    const batteryCapacity = BATTERY_PACKS[model];

    // 🔹 2. Current Ah
    const currentAh = (soc / 100) * batteryCapacity;

    // 🔹 3. Required Ah for selected range
    const requiredAh = desiredRange / RANGE_PER_AH;

    const targetAh = currentAh + requiredAh;

    if (targetAh > batteryCapacity) {
      return res.json({
        message: "Requested range exceeds battery capacity"
      });
    }

    console.log("Current Ah:", currentAh);
    console.log("Target Ah:", targetAh);

    // 🔹 4. Start Charger
    await axios.post(
      `${CSMS_URL}/ocpp/1.6/evdriver/remoteStartTransaction?identifier=${CHARGER_ID}&tenantId=${TENANT_ID}`,
      {
        connectorId: 1,
        idTag: "TEST_TAG"
      }
    );

    // 🔹 5. Monitor charging
    monitorCharging(vin, targetAh, batteryCapacity);

    res.json({ message: "Auto charging started" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

async function monitorCharging(vin, targetAh, batteryCapacity) {

  const interval = setInterval(async () => {

    const result = await pool.query(
      "SELECT data FROM vehicledata WHERE data->>'vin' = $1 ORDER BY id DESC LIMIT 1",
      [vin]
    );

    const vehicle = result.rows[0].data;
    const soc = vehicle.soc;

    const currentAh = (soc / 100) * batteryCapacity;

    console.log("Current Ah:", currentAh);

    if (currentAh >= targetAh) {

      console.log("Target reached. Stopping charger.");

      await axios.post(
        `${CSMS_URL}/ocpp/1.6/evdriver/remoteStopTransaction?identifier=${CHARGER_ID}&tenantId=${TENANT_ID}`,
        {
          transactionId: 123 // Replace with real transactionId
        }
      );

      clearInterval(interval);
    }

  }, 10000); // check every 10 sec
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
