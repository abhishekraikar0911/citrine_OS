#!/bin/bash

# Quick verification script after client firmware flash
# Run this to verify the connection is working

STATION_ID="250822008C06"

echo "=== Quick Connection Verification ==="
echo ""

# 1. Check WebSocket connection
echo "1. WebSocket Connection Status:"
CONNECTIONS=$(netstat -an 2>/dev/null | grep ":9000 " | grep ESTABLISHED | wc -l)
if [ "$CONNECTIONS" -gt 0 ]; then
    echo "   ✅ CONNECTED - $CONNECTIONS active connection(s)"
    netstat -an | grep ":9000 " | grep ESTABLISHED
else
    echo "   ❌ NOT CONNECTED - Client hasn't connected yet"
fi
echo ""

# 2. Check recent logs
echo "2. Recent CitrineOS Logs for $STATION_ID:"
RECENT_LOGS=$(docker logs csms-core --tail 100 2>&1 | grep "$STATION_ID" | tail -5)
if [ -z "$RECENT_LOGS" ]; then
    echo "   ❌ No recent logs - Client not communicating"
else
    echo "$RECENT_LOGS"
fi
echo ""

# 3. Check database for recent activity
echo "3. Recent Database Activity:"
docker exec csms-postgres psql -U citrine -d citrine -c "SELECT id, \"updatedAt\" FROM \"ChargingStations\" WHERE id = '$STATION_ID';" 2>/dev/null
echo ""

# 4. Test RemoteStartTransaction API
echo "4. Testing RemoteStartTransaction API:"
RESPONSE=$(curl -s -X POST "http://localhost:8081/ocpp/1.6/evdriver/remoteStartTransaction?identifier=$STATION_ID&tenantId=1" \
  -H "Content-Type: application/json" \
  -d '{"connectorId": 1, "idTag": "TEST_TAG"}')
echo "   Response: $RESPONSE"
echo ""

echo "=== Summary ==="
if [ "$CONNECTIONS" -gt 0 ] && [ ! -z "$RECENT_LOGS" ]; then
    echo "✅ Status: CONNECTED AND WORKING"
    echo "   You can now test RemoteStart/Stop from the UI!"
else
    echo "⏳ Status: WAITING FOR CLIENT"
    echo "   Client team needs to flash the firmware"
fi
