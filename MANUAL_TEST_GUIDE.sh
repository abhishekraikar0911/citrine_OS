#!/bin/bash
# Manual RemoteStart/RemoteStop Test Commands
# These commands test the OCPP remote start/stop functionality

echo "=== MANUAL REMOTE START/STOP TEST ==="
echo ""
echo "STEP 1: Check current database state"
echo "Run this command:"
echo ""
echo 'docker exec csms-postgres psql -U citrine -d citrine -c "SELECT id, \"transactionId\", \"isActive\" FROM \"Transactions\" WHERE \"stationId\"='"'"'250822008C06'"'"' ORDER BY id DESC LIMIT 1;"'
echo ""
echo "---"
echo ""

echo "STEP 2: Send RemoteStartTransaction request"
echo "Copy the identifier from Step 1, then run:"
echo ""
echo 'curl -X POST "http://localhost:8081/ocpp/1.6/evdriver/remoteStartTransaction?identifier=250822008C06" \'  
echo '  -H "Content-Type: application/json" \'
echo '  -d '"'"'{
    "idTag": "TEST123",
    "connectorId": 1,
    "tenantId": 1
  }'"'"''
echo ""
echo "Expected: [{\"success\": true}]"
echo ""
echo "---"
echo ""

echo "STEP 3: Wait a few seconds for transaction to be created"
echo "Run this:"
echo ""
echo "sleep 5"
echo ""
echo "---"
echo ""

echo "STEP 4: Check if new transaction was created"
echo "Run:"
echo ""
echo 'docker exec csms-postgres psql -U citrine -d citrine -c "SELECT id, \"transactionId\", \"isActive\" FROM \"Transactions\" WHERE \"stationId\"='"'"'250822008C06'"'"' ORDER BY id DESC LIMIT 1;"'
echo ""
echo "Note the new transaction ID (different from step 1)"
echo ""
echo "---"
echo ""

echo "STEP 5: Send RemoteStopTransaction (replace TXID with actual transaction ID from Step 4)"
echo ""
echo 'curl -X POST "http://localhost:8081/ocpp/1.6/evdriver/remoteStopTransaction?identifier=250822008C06" \'
echo '  -H "Content-Type: application/json" \'
echo '  -d '"'"'{
    "transactionId": TXID,
    "tenantId": 1
  }'"'"''
echo ""
echo "Expected: [{\"success\": true}]"
echo ""
echo "---"
echo ""

echo "STEP 6: Wait and verify transaction was stopped"
echo ""
echo "sleep 5"
echo 'docker exec csms-postgres psql -U citrine -d citrine -c "SELECT id, \"transactionId\", \"isActive\", \"endTime\" FROM \"Transactions\" WHERE \"stationId\"='"'"'250822008C06'"'"' ORDER BY id DESC LIMIT 1;"'
echo ""
echo "isActive should be false (f)"
echo ""
echo "---"
echo ""

echo "STEP 7: Check server logs for handler confirmation"
echo ""
echo "docker logs csms-core --since 5m | grep -i 'remote\|accepted'"
echo ""
echo "Should see messages like:"
echo '  - "RemoteStartTransaction accepted by station 250822008C06"'
echo '  - "RemoteStopTransaction accepted by station 250822008C06"'
echo ""
