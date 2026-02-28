# CitrineOS Remote Start/Stop Quick Reference

## API Endpoints

### 1. Remote Start Transaction
**Endpoint**: `POST /ocpp/1.6/evdriver/remoteStartTransaction`  
**Port**: 8080 (default)

**Request**:
```bash
curl -X POST http://localhost:8080/ocpp/1.6/evdriver/remoteStartTransaction \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": ["STATION_ID"],
    "request": {
      "connectorId": CONNECTOR_NUMBER,
      "idTag": "ID_TOKEN"
    },
    "tenantId": 1
  }'
```

**Request Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| identifier | string[] | Yes | Array with station ID |
| request.connectorId | number | No | Connector number (1, 2, 3...) |
| request.idTag | string | Yes | ID token (card/RFID ID) |
| tenantId | number | No | Default: 1 |

**Response** (Success):
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

**Response** (Error):
```json
[
  {
    "success": false,
    "error": "Station not connected"
  }
]
```

---

### 2. Remote Stop Transaction
**Endpoint**: `POST /ocpp/1.6/evdriver/remoteStopTransaction`  
**Port**: 8080 (default)

**Request**:
```bash
curl -X POST http://localhost:8080/ocpp/1.6/evdriver/remoteStopTransaction \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": ["STATION_ID"],
    "request": {
      "transactionId": TRANSACTION_ID
    },
    "tenantId": 1
  }'
```

**Request Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| identifier | string[] | Yes | Array with station ID |
| request.transactionId | number | Yes | OCPP Transaction ID (NOT database ID) |
| tenantId | number | No | Default: 1 |

**Response** (Success):
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

**Response** (Error):
```json
[
  {
    "success": false,
    "error": "Station not connected"
  }
]
```

---

## Database Queries

### Get Active Transactions
```sql
SELECT id, stationId, transactionId, isActive, startTime, endTime 
FROM transactions 
WHERE stationId='250822008C06' AND isActive=true;
```

### Get Transaction with Stop Details
```sql
SELECT 
  t.id, t.transactionId, t.isActive, 
  t.startTime, t.endTime,
  st.meterStop, st.reason
FROM transactions t 
LEFT JOIN stop_transactions st ON st.transactionDatabaseId = t.id
WHERE t.stationId='250822008C06' 
ORDER BY t.id DESC LIMIT 5;
```

### Run via Docker
```bash
docker exec -it csms-db psql -U postgres -d citrineos -c \
  "SELECT id, stationId, transactionId, isActive, startTime, endTime 
   FROM transactions 
   WHERE stationId='250822008C06' 
   ORDER BY id DESC LIMIT 5;"
```

---

## Expected Log Messages

### When RemoteStart Works ✅

**Client (ESP32 Serial)**:
```
[OCPP] 📨 Received RemoteStartTransaction
[OCPP] ✅ RemoteStartTransaction accepted (latching)
[OCPP] 🚀 StartTransaction queued to server
[OCPP] ↔️  StartTransaction sent (txId: 1234567890)
```

**Server (CitrineOS)**:
```
[EVDriver] RemoteStartTransactionResponse received: {...status: 'Accepted'}
[EVDriver] RemoteStartTransaction accepted by station 250822008C06
[Transactions] StartTransactionRequest received from station 250822008C06
[Transactions] Transaction created with txId: 1234567890
```

### When RemoteStop Works ✅

**Client (ESP32 Serial)**:
```
[OCPP] 🛑 Received RemoteStop
[OCPP] 🛑 RemoteStop → ending transaction
[OCPP] ✅ StopTransaction queued to server
[OCPP] ↔️  StopTransaction sent
[OCPP] ⏹️  Transaction STOPPED and UNLOCKED
[GATE] 🔒 HARD GATE CLOSED
```

**Server (CitrineOS)**:
```
[EVDriver] RemoteStopTransactionResponse received: {...status: 'Accepted'}
[EVDriver] RemoteStopTransaction accepted by station 250822008C06
[Transactions] StopTransactionRequest received from station 250822008C06
[Transactions] Transaction closed: txId=1234567890
```

---

## Common Issues

### ❌ "Station not connected"
```json
{
  "success": false,
  "error": "Station not connected"
}
```
**Fix**: Check if station ID is correct and WebSocket connection is active:
```bash
docker logs csms-citrineos-core | grep "250822008C06"
```

### ❌ "Invalid transaction ID"
**Fix**: Use the OCPP `transactionId`, NOT the database `id`:
```bash
# WRONG (database ID):
{"request": {"transactionId": 42}}

# CORRECT (OCPP transactionId):
{"request": {"transactionId": 1234567890}}
```

### ⚠️ RemoteStart accepted but no DB transaction
**Check**:
1. Can you see StartTransaction in logs?
2. RabbitMQ queue blocked? `docker exec csms-rabbitmq rabbitmqctl list_queues`
3. Did response handler get deployed? Check server logs for our new handler

### ⚠️ Client shows "operation timeout: Heartbeat"
**Cause**: MeterValues queue congestion  
**Fix**: Lower sample interval in ESP32 firmware or temporarily disable

---

## Test Automation

### Run Full Test
```bash
cd /opt/csms
chmod +x END_TO_END_TEST.sh
./END_TO_END_TEST.sh
```

### Monitor Logs While Testing
```bash
# Terminal 1: Server logs
docker logs -f csms-citrineos-core --tail 100

# Terminal 2: Database watch (runs query every 2s)
watch -n 2 'docker exec -it csms-db psql -U postgres -d citrineos -c \
  "SELECT id, stationId, transactionId, isActive, startTime, endTime 
   FROM transactions 
   WHERE stationId='"'"'250822008C06'"'"' 
   ORDER BY id DESC LIMIT 5;"'

# Terminal 3: Client serial
minicom -D /dev/ttyUSB0 -b 115200
```

---

## Configuration Variables

Update these in test scripts:

```bash
CITRINE_API="http://localhost:8080"  # Change to your server URL
STATION_ID="250822008C06"            # Your actual station ID
CONNECTOR_ID="1"                     # Your connector number
ID_TAG="TEST123"                     # Your test card/token
TENANT_ID="1"                        # Your tenant ID (default 1)
```

---

## Success Checklist

Before declaring success, verify:

- [ ] RemoteStart reaches client within 5 seconds
- [ ] Client responds with "✅ accepted" message
- [ ] Database shows new transaction with `isActive=true`
- [ ] RemoteStop reaches client within 5 seconds
- [ ] Client shows "🛑 RemoteStop → ending transaction"
- [ ] Server logs show "StopTransaction received"
- [ ] Database shows transaction with `isActive=false` and populated `endTime`
- [ ] `stop_transactions` record exists with `meterStop` value

---

## Support

If issues occur:

1. Capture logs with timestamps
2. Include error messages (search for ❌ or error in logs)
3. Check what was deployed:
   ```bash
   docker exec csms-citrineos-core npm list @citrineos/base
   ```
4. Verify code change is in running container:
   ```bash
   docker exec csms-citrineos-core grep -n "_handleRemoteStartTransaction" \
     /app/citrineos-core/03_Modules/EVDriver/src/module/module.ts
   ```

---
