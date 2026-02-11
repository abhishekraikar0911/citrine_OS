#!/bin/bash

# Rapid RemoteStart + RemoteStop Test
# Tests the complete cycle without device reboot

STATION_ID="250822008C06"
SERVER="http://localhost:8081"

echo "🚀 RAPID REMOTE START/STOP TEST"
echo "=================================="
echo ""
echo "ℹ️  Instructions:"
echo "1. Start this script"
echo "2. Look at charger serial monitor"
echo "3. Watch for State: Preparing"
echo "4. When you see it, the test AUTOMATICALLY begins"
echo ""
echo "Waiting for you to press ENTER when charger shows 'State: Preparing'..."
read -p "Press ENTER when ready: "

clear
echo "⏱️  TEST SEQUENCE STARTING..."
echo ""
TIMESTAMP=$(date +"%H:%M:%S")
echo "[$TIMESTAMP] 📤 Sending RemoteStartTransaction..."

# Get server logs before test
SERVER_LOG_BEFORE=$(docker logs csms-core --tail 20 2>&1)

# Send RemoteStart
curl -s -X POST "$SERVER/ocpp/1.6/evdriver/remoteStartTransaction?identifier=$STATION_ID" \
  -H "Content-Type: application/json" \
  -d '{"idTag":"TEST123","connectorId":1}' > /tmp/start_response.json

START_RESPONSE=$(cat /tmp/start_response.json)
echo "   Response: $START_RESPONSE"

echo ""
echo "⏳ Waiting 2 seconds for transaction to activate..."
sleep 2

TIMESTAMP=$(date +"%H:%M:%S")
echo "[$TIMESTAMP] 🛑 Sending RemoteStopTransaction..."

# Send RemoteStop
curl -s -X POST "$SERVER/ocpp/1.6/evdriver/remoteStopTransaction?identifier=$STATION_ID" \
  -H "Content-Type: application/json" \
  -d '{"transactionId":0}' > /tmp/stop_response.json

STOP_RESPONSE=$(cat /tmp/stop_response.json)
echo "   Response: $STOP_RESPONSE"

echo ""
echo "=================================="
echo "📊 TEST RESULTS"
echo "=================================="
echo ""

# Check server logs
echo "🔍 Checking server logs for OCPP messages..."
echo ""

docker logs csms-core --since 20s 2>&1 | grep -E "RemoteStart|RemoteStop|accepted|rejected|Charging|Available" | tail -20

echo ""
echo "=================================="
echo "✅ TEST COMPLETE"
echo "=================================="
echo ""
echo "📋 Check on your charger serial monitor:"
echo "   ✓ Did contactor turn ON? (>>> CONTACTOR ON <<<)"
echo "   ✓ Did state change to Charging?"
echo "   ✓ Did contactor turn OFF? (>>> CONTACTOR OFF <<<)"
echo "   ✓ Did state return to Available/Preparing?"
echo ""
