# Stop Transaction Issue - Root Cause & Solution

## Issue Description
When testing StopTransaction via the test-UI, the request is being sent with `transactionId: 0` instead of the actual active transaction ID.

### Symptoms:
- ✅ Start Transaction works → Charger starts charging
- ✅ SoC, Model, Range showing correctly
- ❌ Stop Transaction fails → TransactionId is always 0
- ❌ Charger continues charging despite StopTransaction request

---

## Root Cause Analysis

### Problem 1: GraphQL Query Issue
**File:** `test-ui.html` (lines ~356-375)

The current GraphQL query:
```graphql
query GetStatus($stationId: String!, $connectorId: Int!) {
    Connectors(where: {stationId: {_eq: $stationId}, connectorId: {_eq: $connectorId}}) {
        status
    }
    Transactions(where: {stationId: {_eq: $stationId}, isActive: {_eq: true}}, limit: 1) {
        transactionId
    }
}
```

**Issues:**
1. ❌ Hasura may require `tenantId` in the query filter (default tenant = 1)
2. ❌ The query doesn't specify ordering, might get wrong transaction
3. ❌ `isActive: true` may not be the best filter for detecting current transaction

### Problem 2: Transaction Not Marked as Active
The database transaction might not be marked `isActive=true` when StartTransaction completes.

### Problem 3: Missing Error Handling
The test-UI doesn't log GraphQL errors or show why the query failed.

---

## Solutions

### Solution 1: Fix test-ui.html GraphQL Query
**Update the GraphQL query to be more robust:**

```javascript
// Better GraphQL query with proper filtering and ordering
const query = `
    query GetStatus($stationId: String!, $connectorId: Int!, $tenantId: Int!) {
        Connectors(where: {
            stationId: {_eq: $stationId}, 
            connectorId: {_eq: $connectorId},
            evse: {stationId: {_eq: $stationId}}
        }) {
            status
        }
        Transactions(where: {
            stationId: {_eq: $stationId}, 
            isActive: {_eq: true},
            tenantId: {_eq: $tenantId}
        }, limit: 1, order_by: {id: desc}) {
            id
            transactionId
            startTransaction {
                meterStart
            }
        }
    }
`;

const variables = { stationId, connectorId, tenantId: 1 };
```

### Solution 2: Add Error Logging
Always check for GraphQL errors and log them:

```javascript
const result = await response.json();

// CHECK FOR GRAPHQL ERRORS
if (result.errors) {
    console.error('GraphQL Errors:', result.errors);
    showStatus(`GraphQL Error: ${result.errors[0].message}`, 'error');
    return;
}

if (result.data?.Transactions && result.data.Transactions.length > 0) {
    currentTransactionId = result.data.Transactions[0].transactionId;
} else {
    console.warn('No active transaction found in database');
}
```

### Solution 3: Verify Transaction is Active
**Check in CSMS logs** that StartTransaction is setting `isActive=true`:

```bash
docker logs csms-core 2>&1 | grep -i "isActive\|transaction.*saved" | tail -20
```

If transactions aren't being marked active, check the Transactions Module code in `citrineos-core/03_Modules/Transactions/src/module/module.ts`

---

## Implementation Steps

### Step 1: Update test-ui.html (Lines 356-375)

Replace the current pollStatus function's query with:

```javascript
async function pollStatus() {
    const stationId = document.getElementById('stationId').value;
    const connectorId = parseInt(document.getElementById('connectorId').value);
    const badge = document.getElementById('statusBadge');
    const txInfo = document.getElementById('activeTransaction');
    const lastPolled = document.getElementById('lastPolled');

    if (!stationId) return;

    try {
        // IMPROVED QUERY - with tenantId and better ordering
        const query = `
            query GetStatus($stationId: String!, $connectorId: Int!) {
                Connectors(where: {
                    stationId: {_eq: $stationId}, 
                    connectorId: {_eq: $connectorId}
                }) {
                    status
                }
                Transactions(where: {
                    stationId: {_eq: $stationId}, 
                    isActive: {_eq: true}
                }, limit: 1, order_by: {createdAt: desc}) {
                    id
                    transactionId
                    startTransaction {
                        transactionId
                        meterStart
                    }
                }
            }
        `;

        const response = await fetch(GRAPHQL_BASE, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-hasura-admin-secret': 'CitrineOS!'
            },
            body: JSON.stringify({
                query: query,
                variables: { stationId, connectorId }
            })
        });

        const result = await response.json();

        // CHECK FOR GRAPHQL ERRORS
        if (result.errors) {
            console.error('GraphQL Errors:', result.errors);
            badge.textContent = 'API Error';
            badge.className = 'status-badge status-badge-unknown';
            lastPolled.textContent = 'API Error: ' + result.errors[0].message;
            return;
        }

        if (result.data) {
            // Update Status Badge
            const connector = result.data.Connectors[0];
            if (connector) {
                const status = connector.status;
                badge.textContent = status;
                badge.className = 'status-badge ' + getStatusClass(status);
            } else {
                badge.textContent = 'Unknown Station';
                badge.className = 'status-badge status-badge-unknown';
            }

            // Update Transaction Info - IMPROVED
            const activeTx = result.data.Transactions[0];
            if (activeTx && activeTx.transactionId !== null && activeTx.transactionId !== undefined) {
                currentTransactionId = activeTx.transactionId;
                const meterStart = activeTx.startTransaction?.meterStart || 0;
                txInfo.textContent = `Active Tx: ${currentTransactionId} (Started: ${meterStart}W)`;
                txInfo.style.color = '#34d399';
                console.log('Current transaction ID:', currentTransactionId);
            } else {
                currentTransactionId = null;
                txInfo.textContent = 'No active transaction';
                txInfo.style.color = 'var(--text-muted)';
            }

            lastPolled.textContent = new Date().toLocaleTimeString();
        }
    } catch (err) {
        console.error('Polling error:', err);
        badge.textContent = 'Offline';
        badge.className = 'status-badge status-badge-offline';
        lastPolled.textContent = 'Polling error: ' + err.message;
    }
}
```

### Step 2: Verify Database State

Check that transactions are properly marked as active:

```bash
# Connect to PostgreSQL
docker exec -it csms-postgres psql -U citrine -d citrine -c \
"SELECT id, stationId, transactionId, isActive, startTime FROM \"Transactions\" WHERE stationId='250822008C06' ORDER BY id DESC LIMIT 10;"
```

Should show:
- `isActive = true` for current transaction
- `transactionId = 1` (or actual transaction number, NOT 0)

### Step 3: Verify CSMS Logs

Check that StartTransaction successfully saves transaction:

```bash
docker logs csms-core 2>&1 | grep -iE "StartTransaction|isActive" | grep "250822008C06" | tail -20
```

---

## Testing the Fix

### Test Sequence:

1. **Open Test UI:**
   ```
   http://ocpp.rivotmotors.com:9310/simple-test
   ```

2. **Click "Start" Button:**
   - Should see: "Active Tx: 1" in status card
   - Monitor should show SoC, Range, Model ✅

3. **Verify in Browser Console:**
   - Press F12 → Console
   - Should log: `"Current transaction ID: 1"`
   - Should NOT log: `"No active transaction found"`

4. **Click "Stop" Button:**
   - Should send StopTransaction with `transactionId: 1` (not 0)
   - Check CSMS logs: `docker logs csms-core 2>&1 | grep "StopTransaction.*250822008C06"`
   - Should see: `transactionId: 1` in the request payload

5. **Verify Database:**
   - `isActive` should change to `false`
   - Charger should stop charging

---

## Related Files to Check

If the fix doesn't work, check these files:

1. **CSMS Transaction Handler:**
   - `/opt/csms/citrineos-core/03_Modules/Transactions/src/module/module.ts`
   - Look for: `_handleOcpp16StartTransaction` → should set `isActive=true`

2. **Database Model:**
   - `/opt/csms/citrineos-core/01_Data/src/layers/sequelize/model/TransactionEvent/Transaction.ts`
   - Check: `isActive` field definition

3. **GraphQL Schema:**
   - Hasura console: `http://localhost:8090`
   - Check: Transactions table has `isActive` field

4. **User-UI Integration:**
   - `/opt/csms/citrineos-user-ui/src/components/remote-stop-button.tsx`
   - Should also use updated GraphQL query

---

## Summary

| Issue | Cause | Fix |
|-------|-------|-----|
| `transactionId: 0` | GraphQL query not finding active transaction | Update query with proper filters and error handling |
| Missing Transaction ID | Database not setting `isActive=true` | Verify Transactions Module handler |
| Stop fails silently | No error feedback in UI | Add console logging and error display |
| User-UI also broken | Uses same GraphQL query | Apply same fix to user-ui |

---

## Verification Checklist

After implementing fixes:

- [ ] Test-UI shows correct transaction ID when charging
- [ ] Browser console logs transaction ID (no undefined)
- [ ] Stop button sends correct transactionId (not 0)
- [ ] CSMS logs show StopTransaction with valid ID
- [ ] Database shows `isActive=false` after stop
- [ ] Charger actually stops charging
- [ ] User-UI works with same fix

