# End-to-End Test Guide: RemoteStart/RemoteStop Flow

## Overview

This guide helps you verify the complete RemoteStart → StartTransaction → RemoteStop → StopTransaction flow across:
- **Client**: ESP32 with MicroOcpp (serial logs)
- **Server**: CitrineOS (application logs)
- **Database**: Transaction state verification

---

## Setup Requirements

### Prerequisites
1. **CitrineOS Server** running and accessible
   ```bash
   docker ps | grep csms  # Verify containers running
   ```

2. **ESP32 Client** connected to same network and registered with CitrineOS
   ```bash
   # In CitrineOS logs, should see:
   # [WebSocket] Charging station '250822008C06' connected
   ```

3. **Serial Monitor** for ESP32 output (in separate terminal)
   ```bash
   # Using minicom (Linux/Mac)
   minicom -D /dev/ttyUSB0 -b 115200
   
   # Or VS Code Serial Monitor extension
   ```

4. **Server Logs** (in separate terminal)
   ```bash
   docker logs -f csms-citrineos-core --tail 100
   ```

5. **Database Access** (to verify final state)
   ```bash
   # PostgreSQL in Docker
   docker exec -it csms-db psql -U postgres -d citrineos -c \
     "SELECT id, transactionId, isActive, startTime, endTime FROM transactions 
      WHERE stationId='250822008C06' 
      ORDER BY id DESC LIMIT 5;"
   ```

---

## Step-by-Step Test Procedure

### Step 1: Prepare Monitoring

**Open 3-4 terminals:**

**Terminal 1: Client Serial Monitor**
```bash
minicom -D /dev/ttyUSB0 -b 115200
# Wait for output...
```

**Terminal 2: Server Logs**
```bash
cd /opt/csms
docker logs -f csms-citrineos-core --tail 100
```

**Terminal 3: Database Monitor (optional)**
```bash
docker exec -it csms-db psql -U postgres -d citrineos -c \
  "SELECT id, stationId, transactionId, isActive, startTime, endTime FROM transactions 
   WHERE stationId='250822008C06' 
   ORDER BY id DESC LIMIT 5;"
```

**Terminal 4: API Test Commands**
```bash
cd /opt/csms
chmod +x END_TO_END_TEST.sh
# Will use this for running commands
```

---

### Step 2: Send RemoteStartTransaction

**API Endpoint**: `POST /ocpp/1.6/evdriver/remoteStartTransaction`

**Request Body**:
```json
{
  "identifier": ["250822008C06"],
  "request": {
    "connectorId": 1,
    "idTag": "TEST123"
  },
  "tenantId": 1
}
```

**Command**:
```bash
curl -X POST http://localhost:8080/ocpp/1.6/evdriver/remoteStartTransaction \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": ["250822008C06"],
    "request": {
      "connectorId": 1,
      "idTag": "TEST123"
    },
    "tenantId": 1
  }' | jq
```

**Expected Response**:
```json
[
  {
    "success": true,
    "payload": {
      "status": "Accepted"
    }
  }
]
```

---

### Step 3: Monitor Client Serial Output

**Look for these messages in ESP32 serial monitor** (should appear within 2-5 seconds):

```
[OCPP] 📨 Received RemoteStartTransaction
[OCPP] ✅ RemoteStartTransaction accepted (latching)
[OCPP] 🚀 StartTransaction queued to server
[OCPP] ↔️  StartTransaction sent (txId: 1234567890)
```

**Checkpoint**: If you don't see these, the message didn't reach the client. Check:
- [ ] Is station ID "250822008C06" correct in server?
- [ ] Is ESP32 WebSocket connection showing in CitrineOS logs?
- [ ] Check `docker logs csms-citrineos-core` for "RemoteStartTransaction forwarded to station"

---

### Step 4: Monitor Server Logs

**Look for these in CitrineOS logs** (should appear within 2-5 seconds):

```
[EVDriver] RemoteStartTransactionResponse received: {context: {stationId: '250822008C06'}, payload: {status: 'Accepted'}}
[EVDriver] RemoteStartTransaction accepted by station 250822008C06. Expecting StartTransaction request to follow.
[Transactions] StartTransactionRequest received from station 250822008C06
[Transactions] Transaction created with txId: 1234567890
```

**Checkpoint**: If you don't see "RemoteStartTransaction accepted", the response handler isn't processing it. This would indicate:
- [ ] Our fix didn't get deployed
- [ ] Server wasn't restarted after code changes

---

### Step 5: Verify Transaction Created

**Wait 5 seconds, then query database:**

```bash
docker exec -it csms-db psql -U postgres -d citrineos -c \
  "SELECT id, stationId, transactionId, isActive, startTime, endTime FROM transactions 
   WHERE stationId='250822008C06' AND isActive=true;"
```

**Expected Output**:
```
 id | stationId | transactionId | isActive |        startTime         | endTime
----+-----------+---------------+----------+--------------------------+---------
 42 | 250822008C06 | 1234567890 | t        | 2026-02-09 12:34:56.789  | 
(1 row)
```

**Record the `id` from output** - you'll need this for RemoteStop (it's different from transactionId).

**Checkpoint**: If no transaction record:
- [ ] Check if StartTransaction was received (search logs)
- [ ] Verify database is running: `docker exec csms-db pg_isready`

---

### Step 6: Send RemoteStopTransaction

**Wait 5-10 seconds after startup**, then send stop command.

**API Endpoint**: `POST /ocpp/1.6/evdriver/remoteStopTransaction`

**Request Body** (use `transactionId`, NOT database `id`):
```json
{
  "identifier": ["250822008C06"],
  "request": {
    "transactionId": 1234567890
  },
  "tenantId": 1
}
```

**Command**:
```bash
curl -X POST http://localhost:8080/ocpp/1.6/evdriver/remoteStopTransaction \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": ["250822008C06"],
    "request": {
      "transactionId": 1234567890
    },
    "tenantId": 1
  }' | jq
```

**Expected Response**:
```json
[
  {
    "success": true,
    "payload": {
      "status": "Accepted"
    }
  }
]
```

---

### Step 7: Monitor Client Stop Sequence

**Look for these in ESP32 serial** (should appear within 2-5 seconds):

```
[OCPP] 🛑 Received RemoteStop
[OCPP] 🛑 RemoteStop → ending transaction
[OCPP] ✅ StopTransaction queued to server
[OCPP] ↔️  StopTransaction sent
[OCPP] ⏹️  Transaction STOPPED and UNLOCKED
[GATE] 🔒 HARD GATE CLOSED
```

**Checkpoint**: If you see ❌ or ⚠️ errors, note them. Common issues:
- [ ] `operation timeout: Heartbeat` → MeterValues queue congestion
- [ ] `Received response doesn't match pending operation` → Message ID mismatch
- [ ] CAN bus errors → Hardware issue

---

### Step 8: Monitor Server Stop Sequence

**Look for these in CitrineOS logs** (should appear within 2-5 seconds):

```
[EVDriver] RemoteStopTransactionResponse received: {context: {stationId: '250822008C06'}, payload: {status: 'Accepted'}}
[EVDriver] RemoteStopTransaction accepted by station 250822008C06. Expecting StopTransaction request to follow.
[Transactions] StopTransactionRequest received from station 250822008C06
[Transactions] Transaction closed: txId=1234567890
```

**Checkpoint**: If no StopTransaction received:
- [ ] Client didn't call `endTransactionSafe()` - check ESP32 firmware version
- [ ] Message stuck in queue - check RabbitMQ: `docker exec csms-rabbitmq rabbitmqctl list_queues`

---

### Step 9: Verify Final State

**Query database after stop:**

```bash
docker exec -it csms-db psql -U postgres -d citrineos -c \
  "SELECT t.id, t.transactionId, t.isActive, t.startTime, t.endTime, 
          st.meterStop, st.reason FROM transactions t 
   LEFT JOIN stop_transactions st ON st.transactionDatabaseId = t.id
   WHERE t.stationId='250822008C06' AND t.transactionId=1234567890;"
```

**Expected Output**:
```
 id | transactionId | isActive | startTime          | endTime            | meterStop | reason
----+---------------+----------+--------------------+--------------------+-----------+--------
 42 | 1234567890    | f        | 2026-02-09 12:34  | 2026-02-09 12:35  | 1234      | Remote
(1 row)
```

**Checkpoint**: Verify:
- [ ] `isActive` = `f` (false) ✅
- [ ] `endTime` is populated ✅
- [ ] `stop_transactions` record exists with `meterStop` ✅

---

## Troubleshooting Matrix

| Symptom | Likely Cause | Check |
|---------|--------------|-------|
| RemoteStart never reaches client | Station not connected | `docker logs csms-citrineos-core \| grep "250822008C06"` |
| Client accepts but no DB transaction | StartTransaction lost | Check RabbitMQ queues |
| RemoteStop sent but client doesn't respond | Old firmware without fix | Rebuild/upload ESP32 firmware |
| Transaction stays active after RemoteStop | StopTransaction never sent | Check ESP32 `endTransactionSafe()` implementation |
| Server log shows "accepted" but nothing happens | Response handler not deployed | Rebuild server: `npm run build` + restart |
| MeterValue timeout errors on client | Queue congestion | Lower meter value sample interval |

---

## Log Filtering Commands

**Filter CitrineOS for RemoteStart/Stop:**
```bash
docker logs csms-citrineos-core --since 1m | grep -i "remote"
```

**Filter for EVDriver activity:**
```bash
docker logs csms-citrineos-core --since 1m | grep "\[EVDriver\]"
```

**Filter for Transactions module:**
```bash
docker logs csms-citrineos-core --since 1m | grep "\[Transactions\]"
```

**Check RabbitMQ queue depth:**
```bash
docker exec csms-rabbitmq rabbitmqctl list_queues
```

**Check WebSocket connections:**
```bash
docker logs csms-citrineos-core --since 1m | grep -i "websocket\|connected"
```

---

## Success Criteria

All of these must be true:

- ✅ **Client Serial**: Shows "RemoteStop → ending transaction" + "StopTransaction queued"
- ✅ **Server Logs**: Shows "RemoteStopTransaction accepted" → "StopTransaction received"
- ✅ **Database**: Transaction has `isActive=false` and `endTime` populated
- ✅ **Response Time**: All steps complete within 10-15 seconds total

---

## Next Steps if Issues Occur

1. **Capture full output** for the time window around the test
2. **Share**:
   - Client serial excerpt (±30s around failure)
   - Server logs (same time window)
   - Database query results
3. **Include**:
   - Station ID
   - CitrineOS version/commit
   - ESP32 firmware version

---

## Quick Test Script

Run the automated test:
```bash
cd /opt/csms
chmod +x END_TO_END_TEST.sh
./END_TO_END_TEST.sh
```

This will automate steps 2, 4, 6 and collect responses.

---
