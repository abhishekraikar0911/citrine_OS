#!/bin/bash
# Stop Charging Session Script

echo "======================================"
echo "Stopping Charging Session"
echo "======================================"
echo ""

# Get active transaction ID
echo "Finding active transaction..."
TRANSACTION_ID=$(docker exec csms-postgres psql -U citrine -d citrine -t -c \
  "SELECT \"transactionId\" FROM \"Transactions\" \
   WHERE \"stationId\" = '250822008C06' AND \"isActive\" = true LIMIT 1;" | xargs)

if [ -z "$TRANSACTION_ID" ]; then
  echo "ERROR: No active transaction found for station 250822008C06"
  echo ""
  echo "Recent transactions:"
  docker exec csms-postgres psql -U citrine -d citrine -c \
    "SELECT \"transactionId\", \"isActive\", \"createdAt\" FROM \"Transactions\" \
     WHERE \"stationId\" = '250822008C06' ORDER BY \"createdAt\" DESC LIMIT 3;"
  exit 1
fi

echo "Active Transaction ID: $TRANSACTION_ID"
echo ""

# Send RemoteStop command
echo "Sending RemoteStopTransaction command..."
RESPONSE=$(curl -s -X POST \
  "http://103.174.148.201:8081/ocpp/1.6/evdriver/remoteStopTransaction?identifier=250822008C06&tenantId=1" \
  -H "Content-Type: application/json" \
  -d "{\"transactionId\": $TRANSACTION_ID}")

echo "API Response: $RESPONSE"
echo ""

# Wait for transaction to stop
echo "Waiting 5 seconds for transaction to stop..."
sleep 5

# Check if transaction stopped
echo "Checking transaction status..."
docker exec csms-postgres psql -U citrine -d citrine -c \
  "SELECT \"transactionId\", \"isActive\", \"stoppedReason\", \"endTime\" FROM \"Transactions\" \
   WHERE \"transactionId\" = '$TRANSACTION_ID' AND \"stationId\" = '250822008C06';"
echo ""

echo "Checking connector status..."
docker exec csms-postgres psql -U citrine -d citrine -c \
  "SELECT \"connectorId\", status FROM \"Connectors\" WHERE \"stationId\" = '250822008C06';"
echo ""

echo "======================================"
echo "Done! Check above for results."
echo "======================================"
