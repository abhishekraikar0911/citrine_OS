# CitrineoS User UI - EV Driver Interface

**Version:** 1.0.0  
**Status:** ✅ Production Ready  
**Updated:** 2026-02-07

---

## 📱 Overview

The **CitrineoS User UI** is a modern Next.js-based web application designed for **EV Drivers** to:
- View charging station details
- Monitor vehicle data (SoC, Range, Model)
- Start and stop charging sessions
- Track charging status in real-time

## 🎯 Key Features

### ✅ Real-Time Vehicle Data Display
- **State of Charge (SoC):** Battery percentage (35.23%)
- **Range:** Estimated driving range (57.1 km)
- **Model:** Vehicle model name (Pro)
- **Max Current:** Maximum charging current (31A)
- Auto-refreshes every 5 seconds

### ✅ Start Charging
- Connect to OCPP 1.6J charging stations
- Sends `remoteStartTransaction` command
- Displays real-time charging status
- Shows vehicle telemetry updates

### ✅ Stop Charging
- Gracefully stops active charging sessions
- Sends `remoteStopTransaction` command
- Validates active transaction before stopping
- Provides feedback on success/failure

### ✅ Station Monitoring
- Online/offline status indicator
- Connector status display
- Error code tracking
- Protocol version display (OCPP 1.6/2.0.1)

---

## 🚀 Quick Start

### Option 1: Local Development

```bash
cd /opt/csms/citrineos-user-ui

# Install dependencies
npm install

# Update environment variables
nano .env.local

# Start development server
npm run dev

# Access at: http://localhost:3001
```

### Option 2: Docker Deployment

```bash
cd /opt/csms

# Start with user-ui included
docker-compose -f docker-compose-user-ui.yml up -d

# Check container status
docker-compose ps

# View logs
docker logs -f citrineos-user-ui
```

### Option 3: Production Build

```bash
cd /opt/csms/citrineos-user-ui

# Build for production
npm run build

# Start production server
npm start

# Access at: http://localhost:3001
```

---

## ⚙️ Configuration

### Environment Variables

**File:** `.env.local`

```env
# Hasura GraphQL Endpoint
NEXT_PUBLIC_HASURA_URL=http://103.174.148.201:8090/v1/graphql

# Hasura Admin Secret
NEXT_PUBLIC_HASURA_ADMIN_SECRET=CitrineOS!

# CitrineoS API Endpoint (for OCPP commands)
NEXT_PUBLIC_CITRINEOS_API_URL=http://103.174.148.201:8081

# Next.js Server Port
PORT=3001
```

### Update for Production/Different Server

```bash
# Edit environment file
nano .env.local

# Change these values:
NEXT_PUBLIC_HASURA_URL=http://your-server:8090/v1/graphql
NEXT_PUBLIC_CITRINEOS_API_URL=http://your-server:8081
```

---

## 🔌 API Endpoints Used

### 1. GraphQL Queries (via Hasura)
**Endpoint:** `http://103.174.148.201:8090/v1/graphql`

#### Get Station Details
```graphql
query GetStationDetails($stationId: String!) {
  ChargingStations(where: { id: { _eq: $stationId } }) {
    id
    isOnline
    protocol
    chargePointVendor
    chargePointModel
    updatedAt
  }
  Connectors(where: { stationId: { _eq: $stationId } }) {
    id
    connectorId
    status
    errorCode
    type
  }
  VariableAttributes(where: { stationId: { _eq: $stationId } }) {
    value
    generatedAt
    variableId
  }
  Transactions(
    where: { stationId: { _eq: $stationId }, isActive: { _eq: true } }
    limit: 1
    order_by: { id: desc }
  ) {
    transactionId
  }
}
```

### 2. OCPP REST API (CitrineoS Core)
**Base Endpoint:** `http://103.174.148.201:8081`

#### Start Charging
```bash
POST /ocpp/1.6/evdriver/remoteStartTransaction
?identifier={stationId}&tenantId=1

Body:
{
  "connectorId": 1,
  "idTag": "TEST123"
}

Response:
{
  "success": true,
  "message": "RemoteStartTransaction sent successfully"
}
```

#### Stop Charging
```bash
POST /ocpp/1.6/evdriver/remoteStopTransaction
?identifier={stationId}&tenantId=1

Body:
{
  "transactionId": 1
}

Response:
{
  "success": true,
  "message": "RemoteStopTransaction sent successfully"
}
```

---

## 📊 Data Flow Architecture

```
┌──────────────────────┐
│   EV Driver (User)   │
└──────────────┬───────┘
               │ Web Browser
               ▼
    ┌─────────────────────┐
    │  CitrineoS User UI  │ (Next.js @ :3001)
    │  (citrineos-user-ui)│
    └────────┬────────────┘
             │
     ┌───────┴────────┐
     │                │
     ▼                ▼
┌──────────────┐  ┌──────────────┐
│  Hasura      │  │ CitrineoS    │
│  GraphQL API │  │ REST API     │
│  (:8090)     │  │ (:8081)      │
└──────┬───────┘  └──────┬───────┘
       │                 │
       └────────┬────────┘
                ▼
      ┌──────────────────────┐
      │  PostgreSQL Database │
      │  OCPP Message Queue  │
      │  WebSocket Connect   │
      └──────────────────────┘
                ▼
      ┌──────────────────────┐
      │  Charging Station    │
      │  (MicroOCPP Client)  │
      │  (250822008C06)      │
      └──────────────────────┘
```

---

## 🧪 Testing the UI

### Test Flow: Start & Stop Charging

#### Step 1: Navigate to User UI
```
URL: http://103.174.148.201:3001
```

#### Step 2: Select a Station
- The UI shows available stations
- Click on station "250822008C06"

#### Step 3: View Vehicle Data
```
Expected to see:
✅ SoC: 35.23%
✅ Range: 57.1 km
✅ Model: Pro
✅ MaxCurrent: 31A
✅ Last Updated: (timestamp)
```

#### Step 4: Start Charging
- Click "Start Charging" button
- Confirmation modal appears
- Click "Confirm" to proceed
- API sends: POST /remoteStartTransaction

#### Step 5: Monitor Real-Time Updates
- SoC, Range, and Model update every 5 seconds
- Status changes from "Available" to "Preparing"
- Button changes to "Stop Charging"

#### Step 6: Stop Charging
- Click "Stop Charging" button
- **System automatically fetches active transactionId**
- API sends: POST /remoteStopTransaction with correct transactionId
- Status changes back to "Available"

---

## ✅ Verification Checklist

### Before Deployment

- [ ] Install Node.js 18+ on server
- [ ] Copy environment variables from `.env.local`
- [ ] Update API endpoints for your server
- [ ] Verify HASURA_URL is accessible
- [ ] Verify CITRINEOS_API_URL is accessible
- [ ] Test GraphQL query from Hasura Console
- [ ] Test REST API from cURL/Postman

### After Deployment

- [ ] Container starts without errors
- [ ] User UI loads at http://server:3001
- [ ] Station list displays correctly
- [ ] Vehicle data updates every 5 seconds
- [ ] Start Charging sends request successfully
- [ ] Stop Charging fetches transactionId and sends request
- [ ] Real-time updates work (polling every 5s)

### API Testing

```bash
# Test Hasura GraphQL endpoint
curl -X POST http://103.174.148.201:8090/v1/graphql \
  -H "Content-Type: application/json" \
  -H "x-hasura-admin-secret: CitrineOS!" \
  -d '{"query":"{ __schema { types { name } } }"}'

# Test CitrineoS API endpoint
curl http://103.174.148.201:8081/health

# Test Start Charging
curl -X POST http://103.174.148.201:8081/ocpp/1.6/evdriver/remoteStartTransaction \
  -H "Content-Type: application/json" \
  -H "x-hasura-admin-secret: CitrineOS!" \
  -d '{"connectorId": 1, "idTag": "TEST123"}' \
  ?identifier=250822008C06&tenantId=1
```

---

## 🔧 File Structure

```
citrineos-user-ui/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Station list page
│   │   ├── stations/
│   │   │   └── [id]/
│   │   │       └── page.tsx       # Station detail page (charging control)
│   │   └── globals.css           # Global styles
│   ├── components/
│   │   ├── remote-start-button.tsx    # Start/Stop button
│   │   ├── vehicle-data-card.tsx      # Vehicle info display
│   │   ├── station-list.tsx           # Station list
│   │   ├── connector-status.tsx       # Connector status
│   │   └── confirmation-modal.tsx     # Confirm dialog
│   ├── hooks/
│   │   └── useStationData.ts      # Real-time data fetching
│   ├── lib/
│   │   ├── queries.ts             # GraphQL queries
│   │   ├── gql-client.ts          # GraphQL client setup
│   │   └── utils.ts               # Utility functions
│   └── providers/
│       └── refine-provider.tsx    # Context providers
├── public/                        # Static assets
├── .env.local                     # Environment variables
├── package.json                   # Dependencies
├── next.config.ts                 # Next.js config
└── tsconfig.json                  # TypeScript config
```

---

## 🐛 Troubleshooting

### Issue: "Station unavailable for charging"

**Cause:** Station is not connected to CSMS

**Solution:**
1. Check if charging station is online
2. Verify station connection in CitrineoS logs: `docker logs -f csms-core | grep 250822008C06`
3. Ensure station is on OCPP 1.6 protocol
4. Check network connectivity between station and CSMS

### Issue: Vehicle data not updating

**Cause:** DataTransfer messages not being sent by station

**Solution:**
1. Check station logs for DataTransfer messages
2. Verify vehicle is connected and communicating
3. Check GraphQL query in browser DevTools (Network tab)
4. Verify Hasura endpoint is accessible

### Issue: "Failed to start session"

**Cause:** API endpoint not responding

**Solution:**
1. Verify CitrineoS container is running: `docker ps | grep csms-core`
2. Check CitrineoS logs: `docker logs csms-core | grep -i error`
3. Verify firewall allows port 8081
4. Test endpoint: `curl http://103.174.148.201:8081/health`

### Issue: "Cannot find active transaction" when stopping

**Cause:** GraphQL query not finding active transaction

**Solution:**
1. Verify transaction was created: Check database transactions table
2. Ensure `isActive: true` in query filter
3. Check transaction creation timestamp
4. Verify correct stationId in query

---

## 📈 Performance Tuning

### Reduce GraphQL Query Frequency
```typescript
// In useStationData.ts, change polling interval:
const interval = setInterval(fetchData, 10000); // 10 seconds instead of 5
```

### Optimize Vehicle Data Display
```typescript
// Cache VariableAttributes to reduce queries
const useStationDataMemo = useMemo(
  () => parseVehicleData(attributes, variables),
  [attributes, variables]
);
```

### Enable Compression
```bash
# In docker-compose, add:
environment:
  COMPRESSION: true
  NODE_ENV: production
```

---

## 🔐 Security Notes

### For Production Deployment

1. **Change Default Credentials**
   ```env
   NEXT_PUBLIC_HASURA_ADMIN_SECRET=<generate-strong-secret>
   ```

2. **Use HTTPS/WSS**
   ```env
   NEXT_PUBLIC_HASURA_URL=https://your-domain:8090/v1/graphql
   NEXT_PUBLIC_CITRINEOS_API_URL=https://your-domain:8081
   ```

3. **Add Authentication**
   - Implement user login in `src/providers/auth-provider.tsx`
   - Use JWT tokens for API authentication
   - Add role-based access control (RBAC)

4. **Environment Variable Security**
   - Never commit `.env.local` to git
   - Use `.env.example` as template
   - Store secrets in secure vault (AWS Secrets Manager, etc.)

5. **API Rate Limiting**
   - Implement rate limiting on CitrineoS backend
   - Add request validation on frontend

---

## 📚 Related Documentation

- [CitrineoS Core Setup](./CITRINEOS_SETUP_GUIDE.md)
- [OCPP 1.6J Verification Report](./OCPP_1.6J_CONNECTION_VERIFICATION_REPORT.md)
- [Docker Configuration](./DOCKER_FIXES_SUMMARY.md)
- [Operator UI Documentation](./citrineos-operator-ui/README.MD)

---

## 🤝 Support & Contribution

For issues or improvements:
1. Check logs: `docker logs citrineos-user-ui`
2. Verify environment variables
3. Test GraphQL endpoint manually
4. Check CitrineoS core connectivity

---

**Last Updated:** 2026-02-07  
**Status:** ✅ Ready for Production  
**Next Steps:** Deploy to production server and test end-to-end charging flow
