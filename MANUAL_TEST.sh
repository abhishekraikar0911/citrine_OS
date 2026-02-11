#!/bin/bash
#
# RemoteStart/Stop Manual Test Commands
# Run these on the CitrineOS server
#

set -e

echo "=========================================="
echo "CitrineOS Remote Start/Stop Manual Test"
echo "=========================================="
echo ""

# Configuration
API_URL="http://localhost:8081"
STATION_ID="250822008C06"
CONNECTOR_ID="1"
ID_TAG="TEST123"
DB_USER="citrine"
DB_NAME="citrine"

echo "[STEP 1] Check existing transactions in database..."
echo ""
docker exec csms-postgres psql -U "$DB_USER" -d "$DB_NAME" -c \
  "SELECT id, \"stationId\", \"transactionId\", \"isActive\" FROM \"Transactions\" 
   WHERE \"stationId\"='$STATION_ID' 
   ORDER BY id DESC LIMIT 5;"
echo ""
echo ""

echo "[STEP 2] Monitor server logs in background..."
echo "(You can Ctrl+C this after testing)"
docker logs -f csms-core --tail 50 &
LOG_PID=$!
sleep 2
echo ""
echo ""

echo "[STEP 3] Send RemoteStartTransaction..."
echo ""
echo "API Call:"
echo "  URL: POST $API_URL/ocpp/1.6/evdriver/remoteStartTransaction"
echo "  Body:"
echo "    identifier: [\"$STATION_ID\"]"
echo "    request.connectorId: $CONNECTOR_ID"
echo "    request.idTag: $ID_TAG"
echo ""

RESPONSE=$(curl -s -X POST "$API_URL/ocpp/1.6/evdriver/remoteStartTransaction" \
  -H "Content-Type: application/json" \
  -d "{
    \"identifier\": [\"$STATION_ID\"],
    \"request\": {
      \"connectorId\": $CONNECTOR_ID,
      \"idTag\": \"$ID_TAG\"
    },
    \"tenantId\": 1
  }")

echo "Response:"
echo "$RESPONSE"
echo ""
echo ""

echo "[STEP 4] Wait 10 seconds for transaction to be created..."
sleep 10
echo ""
echo ""

echo "[STEP 5] Query database for new transaction..."
echo ""
TRANSACTION=$(docker exec csms-postgres psql -U "$DB_USER" -d "$DB_NAME" -c \
  "SELECT id, \"stationId\", \"transactionId\", \"isActive\" FROM \"Transactions\" 
   WHERE \"stationId\"='$STATION_ID' 
   ORDER BY id DESC LIMIT 1;" | tail -n 2 | head -n 1)

echo "$TRANSACTION"
echo ""

# Extract transaction ID
TXID=$(echo "$TRANSACTION" | awk '{print $3}')

if [ -z "$TXID" ] || [ "$TXID" == "---" ]; then
  echo "❌ ERROR: Could not find transaction ID!"
  echo ""
  echo "Transaction might not have been created."
  echo "Check server logs above for errors."
  kill $LOG_PID 2>/dev/null || true
  exit 1
fi

echo "✅ Found Transaction ID: $TXID"
echo ""
echo ""

echo "[STEP 6] Send RemoteStopTransaction..."
echo ""
echo "API Call:"
echo "  URL: POST $API_URL/ocpp/1.6/evdriver/remoteStopTransaction"
echo "  Body:"
echo "    identifier: [\"$STATION_ID\"]"
echo "    request.transactionId: $TXID"
echo ""

STOP_RESPONSE=$(curl -s -X POST "$API_URL/ocpp/1.6/evdriver/remoteStopTransaction" \
  -H "Content-Type: application/json" \
  -d "{
    \"identifier\": [\"$STATION_ID\"],
    \"request\": {
      \"transactionId\": $TXID
    },
    \"tenantId\": 1
  }")

echo "Response:"
echo "$STOP_RESPONSE"
echo ""
echo ""

echo "[STEP 7] Wait 5 seconds for transaction to stop..."
sleep 5
echo ""
echo ""

echo "[STEP 8] Check final transaction state..."
echo ""
docker exec csms-postgres psql -U "$DB_USER" -d "$DB_NAME" -c \
  "SELECT id, \"stationId\", \"transactionId\", \"isActive\", \"startTime\", \"endTime\" 
   FROM \"Transactions\" 
   WHERE \"stationId\"='$STATION_ID' AND \"transactionId\"=$TXID;"
echo ""
echo ""

echo "[STEP 9] Stop log monitoring..."
kill $LOG_PID 2>/dev/null || true
echo ""
echo ""

echo "=========================================="
echo "Test Complete!"
echo "=========================================="
echo ""
echo "Check above for:"
echo "  ✓ RemoteStartTransaction response: success: true"
echo "  ✓ RemoteStopTransaction response: success: true"
echo "  ✓ Database shows isActive changed from t to f"
echo ""
