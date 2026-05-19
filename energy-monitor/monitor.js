const { Pool } = require("pg");
const axios = require("axios");

const pool = new Pool({
  host: "103.174.148.201",
  user: "citrine",
  password: "citrine",
  database: "citrine",
  port: 5432,
});

const CHECK_INTERVAL = 2000;
const TENANT_ID = 1;
const OCPP_BASE = "http://localhost:8081/ocpp/1.6/evdriver";

async function checkAndStopChargers() {

  try {

    console.log("🔍 Checking transactions");

    const txResult = await pool.query(`
      SELECT "transactionId","stationId"
      FROM "Transactions"
      WHERE "isActive" = true
    `);

    for (const tx of txResult.rows) {

      const transactionId = tx.transactionId;
      const stationId = tx.stationId;

      console.log(`➡ TX ${transactionId}`);

      // -------------------
      // GET CURRENT ENERGY (Wh)
      // -------------------
      const telemetry = await pool.query(`
        SELECT energy
        FROM "LiveTelemetry"
        WHERE station_id = $1
        ORDER BY created_at DESC
        LIMIT 1
      `,[stationId]);

      if (telemetry.rows.length === 0) {
        console.log("⚠ no telemetry");
        continue;
      }

      const energyWh = parseFloat(telemetry.rows[0].energy);

      console.log(`⚡ energy ${energyWh} Wh`);

      // -------------------
      // GET TARGET (kWh → Wh)
      // -------------------
      const targetResult = await pool.query(`
        SELECT target_kwh
        FROM charging_targets
        WHERE evse_id LIKE $1
        ORDER BY created_at DESC
        LIMIT 1
      `,[`${stationId}%`]);

      if (targetResult.rows.length === 0) {
        console.log("⚠ no target");
        continue;
      }

      const targetWh = parseFloat(targetResult.rows[0].target_kwh) * 1000;

      console.log(`🎯 target ${targetWh} Wh`);

      // -------------------
      // STOP CHARGER
      // -------------------
      if (energyWh >= targetWh) {

        console.log("🛑 stopping charger");

        await axios.post(
          `${OCPP_BASE}/remoteStopTransaction?identifier=${stationId}&tenantId=${TENANT_ID}`,
          { transactionId }
        );

        await pool.query(`
          UPDATE "Transactions"
          SET "isActive" = false
          WHERE "transactionId" = $1
        `,[transactionId]);

        console.log("✅ charger stopped");
      }

    }

  } catch (err) {
    console.error("❌ error:", err.message);
  }

}

setInterval(checkAndStopChargers, CHECK_INTERVAL);

console.log("🚀 energy monitor started");
