# Quick Test Guide - Remote Start/Stop

## Prerequisites
- CitrineOS running on localhost:8081
- PostgreSQL accessible with credentials: citrine/citrine
- Charging station 250822008C06 connected and ONLINE
- Terminal access to run curl commands

---

## Test Sequence

### Step 1: Check Station Status
```bash
# Verify station is online
docker exec csms-postgres psql -U citrine -d citrine -c \
  "SELECT id, \"isOnline\", protocol FROM \"ChargingStations\" WHERE id='250822008C06';"
```
Expected output: `isOnline = t` (true)

---

### Step 2: Check Current Transactions
```bash
# See what transactions exist before test
docker exec csms-postgres psql -U citrine -d citrine -c \
  "SELECT id, \"transactionId\", \"isActive\", \"startTime\" FROM \"Transactions\" WHERE \"stationId\"='250822008C06' ORDER BY id DESC LIMIT 3;"
```

---

### Step 3: Send RemoteStartTransaction
```bash
curl -X POST "http://localhost:8081/ocpp/1.6/evdriver/remoteStartTransaction?identifier=250822008C06" \
  -H "Content-Type: application/json" \
  -d '{"idTag":"TEST_TAG","connectorId":1,"tenantId":1}'
```

Expected response: `[{"success":true}]`

---

### Step 4: Check Server Logs for Handler Execution (within 5 seconds)
```bash
# Look for new handler messages
docker logs csms-core --since 5s | grep -i "remote\|accepted by station"
```

Expected log message:
```
RemoteStartTransaction accepted by station 250822008C06. Expecting StartTransaction request to follow.
```

---

### Step 5: Wait for Station Response
```bash
# Wait 5 seconds for station to process command
sleep 5

# Check if new transaction was created
docker exec csms-postgres psql -U citrine -d citrine -c \
  "SELECT id, \"transactionId\", \"isActive\" FROM \"Transactions\" WHERE \"stationId\"='250822008C06' ORDER BY id DESC LIMIT 1;"
```

If successful:
- New transaction ID should appear
- `isActive` should be `t` (true) initially

---

### Step 6: Send RemoteStopTransaction (if transaction exists)
```bash
# Replace TXID with actual transactionId from Step 5
curl -X POST "http://localhost:8081/ocpp/1.6/evdriver/remoteStopTransaction?identifier=250822008C06" \
  -H "Content-Type: application/json" \
  -d '{"transactionId":TXID,"tenantId":1}'
```

Example (if transactionId was 2):
```bash
curl -X POST "http://localhost:8081/ocpp/1.6/evdriver/remoteStopTransaction?identifier=250822008C06" \
  -H "Content-Type: application/json" \
  -d '{"transactionId":2,"tenantId":1}'
```

---

### Step 7: Verify Handler Execution
```bash
# Check logs for RemoteStop handler messages
docker logs csms-core --since 5s | grep -i "RemoteStop"
```

Expected log messages:
```
RemoteStopTransaction accepted by station 250822008C06. Expecting StopTransaction request to follow.
```
OR (if station rejects):
```
RemoteStopTransaction rejected by station 250822008C06. Transaction may not stop as expected.
```

---

### Step 8: Check Final Transaction State
```bash
# Verify transaction was stopped
docker exec csms-postgres psql -U citrine -d citrine -c \
  "SELECT id, \"transactionId\", \"isActive\", \"endTime\" FROM \"Transactions\" WHERE \"stationId\"='250822008C06' ORDER BY id DESC LIMIT 1;"
```

Expected result:
- `isActive` should change to `f` (false)
- `endTime` should be populated

---

## Handler Log Level Reference

| Response | Log Level | Meaning |
|----------|-----------|---------|
| Accepted | **INFO** 📘 | Command accepted by station, processing will continue |
| Rejected | **ERROR** 🔴 | Station rejected command, action will NOT execute |
| Unknown | **WARN** 🟡 | Unexpected status value received |

---

## Troubleshooting

### Issue: "No connection found for identifier: 1:250822008C06"
**Cause:** Charger connection dropped or charger is offline  
**Solution:** Verify charger is online using Step 1 command

### Issue: No new transaction created after RemoteStart
**Cause:** Station authorization failed (idTag not valid) or charger in error state  
**Solution:** Check server logs for authorization errors; check charger serial monitor

### Issue: RemoteStop rejected
**Cause:** Transaction ID doesn't exist or transaction already completed  
**Solution:** Verify transaction exists and is active using Step 2 command

---

## Real-Time Monitoring

### Monitor server logs live:
```bash
docker logs csms-core -f --since 30s | grep -i "remote\|transaction"
```

### Monitor database changes:
```bash
watch -n 1 'docker exec csms-postgres psql -U citrine -d citrine \
  -c "SELECT \"transactionId\", \"isActive\" FROM \"Transactions\" \
      WHERE \"stationId\"='"'"'250822008C06'"'"' \
      ORDER BY id DESC LIMIT 1;"'
```

---

## Success Criteria

✅ RemoteStart response logged as **INFO**  
✅ RemoteStop response logged appropriately (INFO if accepted, ERROR if rejected)  
✅ Station IDs visible in all log messages  
✅ Transactions created/updated in database  
✅ No application errors in logs  

## Complete Test Script

```bash
#!/bin/bash
STATION="250822008C06"
IDTAG="TEST_$(date +%s)"

echo "🚀 Starting Remote Start/Stop Test"
echo "Station: $STATION"
echo ""

echo "1️⃣ Sending RemoteStartTransaction..."
curl -s -X POST "http://localhost:8081/ocpp/1.6/evdriver/remoteStartTransaction?identifier=$STATION" \
  -H "Content-Type: application/json" \
  -d "{\"idTag\":\"$IDTAG\",\"connectorId\":1,\"tenantId\":1}"
echo ""

echo "2️⃣ Waiting for station response (5s)..."
sleep 5

echo "3️⃣ Checking for handler messages..."
docker logs csms-core --since 5s | grep -i "remote\|accepted"
echo ""

echo "4️⃣ Device test completed!"
```

Save as `test_remote_start_stop.sh` and run: `bash test_remote_start_stop.sh`
