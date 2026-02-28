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
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 5432,
  ssl: false
});

pool.connect()
  .then(() => console.log("DB Connected ✅"))
  .catch(err => console.error("DB Error:", err.message));

/* ==============================
   STRIPE CHECKOUT
============================== */
app.use(express.json());

app.post("/api/checkouts", async (req, res) => {
  try {
    const { evse_id, target_kwh, success_url, cancel_url } = req.body;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [{
        price_data: {
          currency: "inr",
          product_data: { name: "EV Charging" },
          unit_amount: Math.round(Number(target_kwh) * 10 * 100)
        },
        quantity: 1
      }],
      success_url,
      cancel_url,
      metadata: {
        evse_id: String(evse_id),
        target_kwh: String(target_kwh)
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
============================== */
app.post("/webhook",
  bodyParser.raw({ type: "application/json" }),
  async (req, res) => {

    const sig = req.headers["stripe-signature"];
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
      console.log("Webhook verified ✅");
    } catch (err) {
      console.error("Webhook error:", err.message);
      return res.status(400).send(`Webhook Error`);
    }

    if (event.type === "checkout.session.completed") {

      const session = event.data.object;
      const { evse_id, target_kwh } = session.metadata;

      try {
        // 🔎 Get active transaction (charger already started)
        const tx = await pool.query(
          `SELECT "transactionId","meterStart"
           FROM "Transactions"
           WHERE "stationId"=$1 AND "isActive"=true
           ORDER BY "transactionId" DESC
           LIMIT 1`,
          [evse_id]
        );

        if (!tx.rows.length) {
          console.log("No active transaction found.");
          return res.sendStatus(200);
        }

        const transactionId = tx.rows[0].transactionId;
        const startWh = Number(tx.rows[0].meterStart);

        // ✅ Insert charging session
        await pool.query(
          `INSERT INTO app_charging_sessions
           (charger_id, connector_id, transaction_id,
            start_energy, target_kwh, status, created_at)
           VALUES ($1, $2, $3, $4, $5, 'charging', NOW())`,
          [
            evse_id,
            1,
            transactionId,
            startWh,
            Number(target_kwh)
          ]
        );

        console.log("Session inserted & monitoring started ✅");

      } catch (err) {
        console.error("DB Insert error:", err.message);
      }
    }

    res.sendStatus(200);
  }
);

/* ==============================
   ENERGY MONITOR (Every 5s)
============================== */
setInterval(async () => {
  try {

    const sessions = await pool.query(
      `SELECT * FROM app_charging_sessions WHERE status='charging'`
    );

    for (const s of sessions.rows) {

      const energy = await pool.query(
        `SELECT
           (mv."sampledValue"->0->>'value')::numeric AS energy_wh
         FROM "MeterValues" mv
         WHERE mv."transactionId"=$1
         ORDER BY mv."createdAt" DESC
         LIMIT 1`,
        [s.transaction_id]
      );

      if (!energy.rows.length) continue;

      const currentWh = Number(energy.rows[0].energy_wh);
      const consumedKwh = (currentWh - Number(s.start_energy)) / 1000;

      console.log(`Session ${s.id} → ${consumedKwh.toFixed(3)} kWh`);

      if (consumedKwh >= Number(s.target_kwh)) {

        console.log("Target reached. Stopping charger...");

        await axios.post(
          `http://localhost:8081/ocpp/1.6/evdriver/remoteStopTransaction?identifier=${s.charger_id}&tenantId=1`,
          { transactionId: s.transaction_id }
        );

        await pool.query(
          `UPDATE app_charging_sessions
           SET status='completed'
           WHERE id=$1`,
          [s.id]
        );

        console.log("Charger stopped automatically ✅");
      }
    }

  } catch (err) {
    console.error("Monitor error:", err.message);
  }

}, 5000);

/* ==============================
   SERVER
============================== */
app.listen(9010, "0.0.0.0", () => {
  console.log("Stripe + Smart Charging running on port 9010 ✅");
});
