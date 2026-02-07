# Stop Transaction Fix - Testing Guide

## Changes Made

### File: `/opt/csms/test-ui.html`

**Updates:**
1. ✅ Enhanced GraphQL query with better field selection
2. ✅ Added `order_by: {createdAt: desc}` to get latest transaction
3. ✅ Added explicit `order_by` clause for reliable transaction retrieval
4. ✅ Added GraphQL error handling and logging
5. ✅ Added transaction ID validation (not null/undefined checks)
6. ✅ Added console logging for debugging
7. ✅ Displays meter start value for context

---

## Testing Steps

### Step 1: Clear Browser Cache & Reload Test UI

```bash
# Open test-ui in fresh browser window
# Press Ctrl+Shift+Delete to clear cache (Chrome)
# Or use Private/Incognito window
http://ocpp.rivotmotors.com:9310/simple-test
```

### Step 2: Open Developer Console

```bash
# Press F12 in browser
# Go to Console tab
# Watch for logs like:
# ✅ Current transaction ID: 1 Meter Start: 0W
# or
# ⚠️ No active transaction found in database
```

### Step 3: Test Start Transaction

1. Enter Station ID: `250822008C06`
2. Enter Connector ID: `1`
3. **Click "Start" Button**

**Expected Results:**
- ✅ Status badge shows: "Charging" or "Preparing"
- ✅ Active Tx line shows: `Active Tx: 1 (Started: 0W)`
- ✅ Console logs: `✅ Current transaction ID: 1 Meter Start: 0W`
- ✅ Charger starts charging (SoC increases every 5 seconds)

**If it fails:**
```bash
# Check logs for any database errors
docker logs csms-core 2>&1 | grep -i "StartTransaction\|isActive" | tail -20

# Check database directly
docker exec -it csms-postgres psql -U citrine -d citrine -c \
"SELECT id, transactionId, isActive, startTime FROM \"Transactions\" WHERE stationId='250822008C06' ORDER BY id DESC LIMIT 5;"
```

### Step 4: Test Stop Transaction

1. **With active transaction running**, click "Stop" Button

**Expected Results:**
- ✅ Console shows: `Processing StopTransaction with ID: 1` (NOT 0!)
- ✅ CSMS logs show: `transactionId: 1` in StopTransaction request
- ✅ Charger stops charging
- ✅ Database shows `isActive = false`

**Verify in CSMS logs:**
```bash
docker logs csms-core 2>&1 | grep -A5 "RemoteStopTransaction\|StopTransaction" | grep "250822008C06" | tail -20
```

Should show:
```
"transactionId": 1,  # ✅ NOT 0!
"payload":{"meterStop":..., "timestamp":"...", "transactionId": 1}
```

**Verify in Database:**
```bash
docker exec -it csms-postgres psql -U citrine -d citrine -c \
"SELECT t.id, t.transactionId, t.isActive, st.id as stopId FROM \"Transactions\" t LEFT JOIN \"StopTransactions\" st ON t.id = st.\"transactionDatabaseId\" WHERE t.stationId='250822008C06' ORDER BY t.id DESC LIMIT 5;"
```

Should show:
- Last transaction: `isActive = false`
- Stop transaction recorded: `stopId = <non-null number>`

---

## Debugging If Still Not Working

### Debug Check 1: GraphQL Endpoint Working?

```bash
# Test Hasura directly
curl -X POST http://localhost:8090/v1/graphql \
  -H "Content-Type: application/json" \
  -H "x-hasura-admin-secret: CitrineOS!" \
  -d '{
    "query": "query { Transactions(limit:1) { id transactionId isActive } }"
  }'
```

Should return data, not errors.

### Debug Check 2: Transaction Table Has Data?

```bash
docker exec -it csms-postgres psql -U citrine -d citrine -c \
"SELECT COUNT(*) FROM \"Transactions\" WHERE stationId='250822008C06';"
```

Should return > 0

### Debug Check 3: Is StartTransaction Setting isActive=true?

```bash
docker logs csms-core 2>&1 | grep -i "StartTransaction" | grep "250822008C06" | head -10
```

Look for logs showing transaction is being created and marked active.

### Debug Check 4: Check Hasura Schema

```bash
# Open Hasura console
# http://localhost:8090
# Go to Data > Transactions
# Verify you can see:
# - id (integer, primary key)
# - transactionId (integer)
# - isActive (boolean)
# - stationId (text)
```

### Debug Check 5: Frontend Console Errors

```javascript
// In browser console, run:
console.log('Station ID:', document.getElementById('stationId').value);
console.log('Current Transaction ID:', currentTransactionId);
console.log('GraphQL Base:', GRAPHQL_BASE);
```

---

## If GraphQL Returns No Data

### Check 1: Is tenantId being filtered correctly?

The default tenant is `1`. If transactions are in a different tenant, the query won't find them.

**Solution:** Add tenantId to test-ui query

```javascript
// In pollStatus function, add to where clause:
Transactions(where: {
    stationId: {_eq: $stationId}, 
    isActive: {_eq: true},
    tenantId: {_eq: 1}  // ADD THIS
})
```

### Check 2: Database Connection Issue?

```bash
# Verify database is accessible
docker exec csms-postgres pg_isready -U citrine -d citrine
# Should return: accepting connections
```

### Check 3: Hasura Metadata Out of Sync?

```bash
# Restart Hasura to reload metadata
docker restart csms-graphql-engine
# Wait 30 seconds, then retry
```

---

## Expected Logs After Fix

### CSMS Logs for Start:
```
2026-02-07 XX:XX:XX.XXX DEBUG ... RemoteStartTransaction
2026-02-07 XX:XX:XX.XXX DEBUG ... EVDriverModule RemoteStartTransactionResponse received
2026-02-07 XX:XX:XX.XXX DEBUG ... TransactionsModule StartTransaction: transaction created
```

### CSMS Logs for Stop (WITH FIX):
```
2026-02-07 XX:XX:XX.XXX DEBUG ... RemoteStopTransaction
  "transactionId": 1  ← THIS SHOULD NOT BE 0!
2026-02-07 XX:XX:XX.XXX DEBUG ... TransactionsModule StopTransaction request received
```

### Database After Stop:
```sql
SELECT transactionId, isActive, (SELECT id FROM "StopTransactions" WHERE "transactionDatabaseId" = "Transactions".id) as hasStop 
FROM "Transactions" 
WHERE stationId='250822008C06' 
ORDER BY id DESC LIMIT 1;

-- Should show:
-- transactionId | isActive | hasStop
-- 1             | f        | <id>
```

---

## User-UI Integration

The citrineos-user-ui also needs the same fix if you want to use it for StopTransaction:

**File:** `/opt/csms/citrineos-user-ui/src/components/remote-stop-button.tsx`

Should use same improved GraphQL query pattern as test-ui.

---

## Verification Checklist

After applying the fix, verify:

- [ ] Test-UI loads without errors
- [ ] Browser console shows "✅ Current transaction ID: X" when charging
- [ ] Start button triggers charging
- [ ] Stop button sends transactionId = actual ID (not 0)
- [ ] CSMS logs show correct transactionId in StopTransaction request
- [ ] Database shows isActive = false after stop
- [ ] Charger actually stops charging
- [ ] Works for multiple start/stop cycles

---

## If Still Not Working

### Option 1: Check Backend Transaction Creation

Verify TransactionsModule is properly creating transactions:

```bash
docker logs csms-core 2>&1 | grep -i "transaction created\|createStartTransaction" | tail -10
```

### Option 2: Direct API Test

```bash
# Try remoteStopTransaction directly with known ID
curl -X POST http://localhost:8081/ocpp/1.6/evdriver/remoteStopTransaction?identifier=250822008C06 \
  -H "Content-Type: application/json" \
  -H "Authorization: Basic admin:citrine" \
  -d '{"transactionId": 1}'
```

### Option 3: Enable Debug Logging

```bash
# Add to CSMS environment if needed
docker logs csms-core | grep -i "transaction" | wc -l
# Should be > 100 if transactions are being processed
```

---

## Success Criteria

✅ **Test UI with fix is working when:**

1. Start button initiates charging
2. Active transaction ID displays correctly in UI
3. Stop button sends request with correct transactionId (not 0)
4. CSMS logs confirm StopTransaction with valid ID
5. Database marks transaction as inactive
6. Charger stops charging immediately

---

**Report Status:** All changes applied to test-ui.html ✅
**Next Step:** Test in browser at http://ocpp.rivotmotors.com:9310/simple-test
**Support:** Check CSMS logs with: `docker logs -f csms-core | grep "250822008C06"`

