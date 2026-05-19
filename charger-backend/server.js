const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");

const app = express();

app.use(cors({
  origin: "*"
}));
app.use(express.json());

// 🔥 START CHARGER API
app.post("/start-charger", async (req, res) => {
  try {
    const response = await fetch(
      "http://localhost:8081/ocpp/1.6/evdriver/remoteStartTransaction?identifier=250822008C06&tenantId=1",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          connectorId: 1,
          idTag: "web-app",
        }),
      }
    );

    const data = await response.text();

    console.log("Citrine Response:", data);

    res.json({ success: true, data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false });
  }
});

app.listen(5000, () => {
  console.log("🚀 Server running on port 5000");
});
