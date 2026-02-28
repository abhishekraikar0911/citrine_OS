# CitrineOS Server Coordination Report
## Client Feedback & Technical Requirements

**Hardware Station ID:** 250822008C06  
**Client Type:** MicroOCPP Physical Hardware  
**Integration Status:** ✅ FUNCTIONAL (with stability notes)

---

## 🚨 URGENT: Connection Stability Issues

### Problem
- **Symptom:** Connection reset by peer (errno 104) errors
- **Frequency:** WebSocket drops every 10-30 seconds
- **Impact:** Affects real-time telemetry and MeterValues consistency
- **Client Mitigation:** Transaction re-hydration logic implemented

### Server Team Action Required
Review and adjust:
- Load balancer timeout configurations
- WebSocket ping/pong settings
- Connection limits per tenant
- Keep-alive intervals

---

## 🔧 Critical Hardware Configuration

### Single Connector Station
**⚠️ CRITICAL:** This hardware supports **Connector 1 ONLY**

```json
// ✅ CORRECT - Use Connector 1
{
  "idTag": "TEST_TAG",
  "connectorId": 1,
  "tenantId": 1
}

// ❌ INCORRECT - Connector 2 does not exist
{
  "connectorId": 2  // Will cause failures
}
```

### Identity Management
- **Physical Hardware:** Use exact Station ID `250822008C06`
- **Simulators:** Use `SIM_` prefix to prevent connection conflicts
- **Authorization:** Use `TEST_TAG` for all operations

---

## ✅ Verified Working Commands

### Remote Start Transaction
```bash
curl -X POST "http://localhost:8081/ocpp/1.6/evdriver/remoteStartTransaction?identifier=250822008C06" \
  -H "Content-Type: application/json" \
  -d '{"idTag":"TEST_TAG","connectorId":1,"tenantId":1}'
```
**Expected Hardware Response:** `[OCPP_CALLBACK] 🔔 TxNotification fired: type=0` → `>>> CONTACTOR ON <<<`

### Remote Stop Transaction
```bash
curl -X POST "http://localhost:8081/ocpp/1.6/evdriver/remoteStopTransaction?identifier=250822008C06" \
  -H "Content-Type: application/json" \
  -d '{"transactionId":N,"tenantId":1}'
```
**Expected Hardware Response:** `[OCPP_CALLBACK] 🔔 TxNotification fired: type=1` → `>>> CONTACTOR OFF <<<`

### Soft Reset
```bash
curl -X POST "http://localhost:8081/ocpp/1.6/configuration/reset?identifier=250822008C06&tenantId=1" \
  -H "Content-Type: application/json" \
  -d '{"type":"Soft"}'
```
**Expected Hardware Response:** `[MO] Reset requested`

---

## 📊 OCPP 1.6 Message Test Matrix

| Message | Priority | Status | Client Response |
|---------|----------|--------|-----------------|
| RemoteStartTransaction | CRITICAL | ✅ WORKING | Contactor engagement |
| RemoteStopTransaction | CRITICAL | ✅ WORKING | Contactor disengagement |
| Reset | HIGH | ✅ WORKING | ESP32 reboot |
| UnlockConnector | MEDIUM | ✅ WORKING | Solenoid unlock |
| ChangeConfiguration | MEDIUM | ✅ WORKING | Setting update |
| GetConfiguration | MEDIUM | ✅ WORKING | Value return |
| TriggerMessage | LOW | ⚠️ 404 ERROR | Endpoint mismatch |

---

## 🔍 Server Monitoring & Verification

### Real-time Log Monitoring
```bash
docker logs csms-core -f --since 30s | grep -i "remote\|transaction"
```

### Database Transaction Verification
```bash
docker exec csms-postgres psql -U citrine -d citrine -c \
"SELECT \"transactionId\",\"isActive\",\"endTime\" FROM \"Transactions\" \
WHERE \"stationId\"='250822008C06' ORDER BY id DESC LIMIT 1;"
```

**Expected Results:**
- After RemoteStart: `isActive = t`
- After RemoteStop: `isActive = f` with populated `endTime`

---

## 🛠️ Client-Side Enhancements Implemented

### Transaction Robustness
- **Re-hydration Logic:** Restores transaction state after WebSocket resets
- **Grace Period:** 30-second zero-current detection prevents premature stops
- **State Persistence:** Maintains transaction context through network interruptions

### Diagnostic Improvements
- **High-visibility Logging:** `[OCPP_CALLBACK]` markers for server command tracking
- **Contactor Status:** Clear `>>> CONTACTOR ON/OFF <<<` indicators
- **Streamlined Telemetry:** Reduced noise for cleaner diagnostic feed

---

## 🎯 Server Team Priorities

### Immediate (Week 1)
1. **Fix WebSocket stability** - errno 104 connection resets
2. **Verify connector mapping** - Ensure all operations target Connector 1
3. **Test TriggerMessage endpoint** - Resolve 404 error

### Short-term (Week 2-3)
1. **Load testing** - Validate stability under multiple concurrent connections
2. **Timeout optimization** - Fine-tune keep-alive and ping/pong intervals
3. **Documentation update** - Single-connector station configuration notes

---

## 📋 Integration Status Summary

**✅ WORKING FEATURES:**
- Physical contactor control
- Transaction lifecycle management
- Database synchronization
- Remote command execution
- Automatic reconnection handling

**⚠️ STABILITY CONCERNS:**
- WebSocket connection resets (server-side issue)
- TriggerMessage endpoint mismatch

**🎉 OVERALL STATUS:** **PRODUCTION READY** with network stability improvements needed

---

## 🔗 Related Documentation
- [OCPP Integration Success Summary](/opt/csms/OCPP_INTEGRATION_SUCCESS.md)
- [UI Application Status](http://localhost:9310)
- [CitrineOS API Documentation](http://localhost:8081)

---
*Report generated for CitrineOS development team coordination*  
*Hardware Station: 250822008C06 | Client: MicroOCPP | Date: $(date)*