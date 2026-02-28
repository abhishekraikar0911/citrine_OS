const express = require("express");
const axios = require("axios");
const { Pool } = require("pg");
const cron = require("node-cron");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

/* ================= DB CONNECTION ================= */

const pool = new Pool({
  host: "103.174.148.201",
  user: "citrine",
  password: "citrine",
  database: "citrine",
  port: 5432,
});

const TENANT_ID = 1;

/* ================= START SESSION ================= */

app.post("/start-session", async (req, res) => {
  try {
    const { charger_id, connector_id, requiredKwh } = req.body;

    console.log("Starting session for:", charger_id);
    console.log("Target kWh:", requiredKwh);

    const session = await pool.query(
      `INSERT INTO app_charging_sessions
       (charger_id, connector_id, target_kwh)
       VALUES ($1,$2,$3)
       RETURNING *`,
      [charger_id, connector_id, requiredKwh]
    );

    await axios.post(
      `http://localhost:8081/ocpp/1.6/evdriver/remoteStartTransaction?identifier=${charger_id}&tenantId=${TENANT_ID}`
    );

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to start session" });
  }
});

/* ================= UPDATE TRANSACTION ================= */

async function updateTransaction() {

  const waiting = await pool.query(
    "SELECT * FROM app_charging_sessions WHERE transaction_id IS NULL"
  );

  for (let session of waiting.rows) {

    const tx = await pool.query(
      `SELECT transaction_id, meter_start
       FROM starttransaction
       WHERE stationid=$1
       ORDER BY timestamp DESC
       LIMIT 1`,
      [session.charger_id]
    );

    if (tx.rows.length > 0) {

      await pool.query(
        `UPDATE app_charging_sessions
         SET transaction_id=$1,
             start_meter=$2,
             status='ACTIVE'
         WHERE id=$3`,
        [
          tx.rows[0].transaction_id,
          tx.rows[0].meter_start,
          session.id
        ]
      );

      console.log("Transaction linked:", tx.rows[0].transaction_id);
    }
  }
}

/* ================= MONITOR ENERGY ================= */

async function monitorCharging() {

  const active = await pool.query(
    "SELECT * FROM app_charging_sessions WHERE status='ACTIVE'"
  );

  for (let session of active.rows) {

    const meter = await pool.query(
      `SELECT meter_value
       FROM metervalues
       WHERE transaction_id=$1
       ORDER BY timestamp DESC
       LIMIT 1`,
      [session.transaction_id]
    );

    if (!meter.rows.length) continue;

    const currentMeter = parseFloat(meter.rows[0].meter_value);
    const delivered = currentMeter - session.start_meter;

    console.log(
      "Delivered:",
      delivered,
      "Target:",
      session.target_kwh
    );

    if (delivered >= session.target_kwh) {

      console.log("Stopping charger...");

      await axios.post(
        `http://localhost:8081/ocpp/1.6/evdriver/remoteStopTransaction?identifier=${session.charger_id}&transactionId=${session.transaction_id}&tenantId=${TENANT_ID}`
      );

      await pool.query(
        `UPDATE app_charging_sessions
         SET status='COMPLETED'
         WHERE id=$1`,
        [session.id]
      );
    }
  }
}

/* ================= RUN EVERY 5 SEC ================= */

cron.schedule("*/5 * * * * *", async () => {
  await updateTransaction();
  await monitorCharging();
});

/* ================= START SERVER ================= */

app.listen(5000, "0.0.0.0", () => {
  console.log("Flash Charger Backend Running on 5000");
});
