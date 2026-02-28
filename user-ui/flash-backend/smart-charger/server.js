require("dotenv").config();
const express = require("express");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const bodyParser = require("body-parser");
const axios = require("axios");
const { Pool } = require("pg");

const app = express();

/* ==============================
   DATABASE
============================== */
const pool = new Pool({
  host: process.env.DB_HOST || "103.174.148.201",
  user: process.env.DB_USER || "citrine",
  password: process.env.DB_PASSWORD || "citrine",
  database: process.env.DB_NAME || "citrine",
  port: process.env.DB_PORT || 5432,
  ssl: false
});

/* ==============================
   STRIPE CHECKOUT API
============================= */
app.use(express.json());

app.post("/api/checkouts", async (req, res) => {
  try {
    const { evse_id, target_kwh, mode, target_value, success_url, cancel_url } = req.body;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "inr",
            product_data: { name: "EV Charging" },
            unit_amount: Math.round(target_kwh * 100 * 10) // ₹10 per kWh
          },
          quantity: 1
        }
      ],
      success_url,
      cancel_url,
      metadata: {
        evse_id,
        target_kwh: target_kwh.toString(),
        mode,
        target_value: target_value.toString()
      }
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("Checkout error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ==============================
   STRIPE WEBHOOK
============================= */
app.post(
  "/webhook",
  bodyParser.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;

    console.log("Webhook hit");

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
      console.log("Webhook verified ✅");
    } catch (err) {
      console.error("Webhook verification failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }


if (event.type === "checkout.session.completed") {
  const session = event.data.object;
  console.log("Checkout session completed event received ✅");

  const { evse_id, target_kwh, mode, target_value } = session.metadata;

  try {
    const result = await pool.query(
      `INSERT INTO app_charging_sessions
       (charger_id, connector_id, target_kwh, status, start_energy, mode, target_value, created_at)
       VALUES ($1, $2, $3, 'pending', 0, $4, $5, now())
       RETURNING id`,
      [evse_id, 1, target_kwh, mode, target_value] // assuming connector_id=1 for now
    );

    const sessionId = result.rows[0].id;
    console.log("Inserted new pending session into DB ✅", sessionId);

    // Optionally, immediately try to start the charger
    await tryStartCharger(evse_id, 1, target_kwh, sessionId);

  } catch (dbErr) {
    console.error("Error inserting session into DB:", dbErr.message);
  }
}

    res.sendStatus(200);
  }
);

/* ==============================
   TRY START CHARGER
============================= */
async function tryStartCharger(chargerId, connectorId, targetKwh, sessionId) {
  try {
    await axios.post(
      `http://localhost:8081/ocpp/1.6/evdriver/remoteStartTransaction?identifier=${chargerId}&tenantId=1`,
      { connectorId, idTag: "FLASH_USER" }
    );

    console.log("RemoteStart sent");

    // Wait for transaction to appear in DB
    await new Promise(resolve => setTimeout(resolve, 4000));

    const tx = await pool.query(
      `SELECT "transactionId","meterStart"
       FROM "Transactions"
       WHERE "stationId"=$1 AND "isActive"=true
       ORDER BY "transactionId" DESC
       LIMIT 1`,
      [chargerId]
    );

    if (!tx.rows.length) {
      console.log("Charger offline or transaction not started yet. Will retry later.");
      return;
    }

    const transactionId = tx.rows[0].transactionId;
    const startWh = tx.rows[0].meterStart;

    // Update pending session with actual transaction info
    await pool.query(
      `UPDATE app_charging_sessions
       SET transaction_id=$1, start_energy=$2, status='charging'
       WHERE id=$3`,
      [transactionId, startWh, sessionId]
    );

    console.log("Pending session updated. Charging started ✅");

  } catch (err) {
    console.error("Error starting charger:", err.message);
  }
}

/* ==============================
   AUTO-MONITOR (Every 5s)
============================= */
setInterval(async () => {
  try {
    // Monitor active charging sessions
    const sessions = await pool.query(`SELECT * FROM app_charging_sessions WHERE status='charging'`);

    for (const session of sessions.rows) {
      const energy = await pool.query(
        `SELECT
           (jsonb_array_elements("sampledValue")->>'value')::numeric AS energy_wh
         FROM "MeterValues"
         WHERE "transactionId"=$1
           AND jsonb_array_elements("sampledValue")->>'measurand'='Energy.Active.Import.Register'
         ORDER BY "createdAt" DESC
         LIMIT 1`,
        [session.transaction_id]
      );

      if (!energy.rows.length) continue;

      const currentWh = energy.rows[0].energy_wh;
      const consumedKwh = (currentWh - session.start_energy) / 1000;

      if (consumedKwh >= session.target_kwh) {
        console.log("Target reached. Stopping charger...");

        await axios.post(
          `http://localhost:8081/ocpp/1.6/evdriver/remoteStopTransaction?identifier=${session.charger_id}&tenantId=1`,
          { transactionId: session.transaction_id }
        );

        await pool.query(
          `UPDATE app_charging_sessions
           SET status='completed'
           WHERE id=$1`,
          [session.id]
        );

        console.log("Charger stopped automatically ✅");
      }
    }

    // Retry pending sessions if charger was offline
    const pending = await pool.query(`SELECT * FROM app_charging_sessions WHERE status='pending'`);
    for (const s of pending.rows) {
      await tryStartCharger(s.charger_id, s.connector_id, s.target_kwh, s.id);
    }

  } catch (err) {
    console.error("Monitor error:", err.message);
  }
}, 5000);

/* ==============================
   SERVER
============================= */
app.listen(9010, "0.0.0.0", () => {
  console.log("Stripe + Smart Charging running on port 9010 ✅");
});
