#!/bin/bash
# Start Charging Session Script

echo "======================================"
echo "Starting Charging Session"
echo "======================================"
echo ""

# Check current status
echo "Current connector status:"
docker exec csms-postgres psql -U citrine -d citrine -t -c \
  "SELECT status FROM \"Connectors\" WHERE \"stationId\" = '250822008C06' AND \"connectorId\" = 1;" | xargs
echo ""

# Send RemoteStart command
echo "Sending RemoteStartTransaction command..."
RESPONSE=$(curl -s -X POST \
  "http://103.174.148.201:8081/ocpp/1.6/evdriver/remoteStartTransaction?identifier=250822008C06&tenantId=1" \
  -H "Content-Type: application/json" \
  -d '{"connectorId": 1, "idTag": "CITRINE_USER"}')

echo "API Response: $RESPONSE"
echo ""

# Wait for transaction to start
echo "Waiting 5 seconds for transaction to start..."
sleep 5

# Check if transaction started
echo "Checking transaction status..."
docker exec csms-postgres psql -U citrine -d citrine -c \
  "SELECT \"transactionId\", \"isActive\", \"createdAt\" FROM \"Transactions\" \
   WHERE \"stationId\" = '250822008C06' ORDER BY \"createdAt\" DESC LIMIT 1;"
echo ""

echo "Checking new connector status..."
docker exec csms-postgres psql -U citrine -d citrine -c \
  "SELECT \"connectorId\", status FROM \"Connectors\" WHERE \"stationId\" = '250822008C06';"
echo ""

echo "======================================"
echo "Done! Check above for results."
echo "======================================"
