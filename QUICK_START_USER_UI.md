# 🚀 CitrineoS User UI - Quick Reference

## Start User UI (Quick Commands)

### Option 1: Automated (RECOMMENDED)
```bash
/opt/csms/start-user-ui.sh
# Auto-setup and starts on port 3001
```

### Option 2: Production Mode
```bash
cd /opt/csms/citrineos-user-ui
npm install && npm run build && npm start
# Access: http://103.174.148.201:3001
```

### Option 3: Development Mode
```bash
cd /opt/csms/citrineos-user-ui
npm install && npm run dev
# Access: http://103.174.148.201:9310 (auto-reload enabled)
```

### Option 4: Docker
```bash
cd /opt/csms
docker-compose -f docker-compose-user-ui.yml up -d
# Access: http://103.174.148.201:3001
```

---

## Check Status

```bash
# Backend containers
docker-compose ps

# User UI logs
docker logs -f citrineos-user-ui

# Backend logs
docker logs -f csms-core | grep "250822008C06\|DataTransfer"

# Test API endpoints
curl http://103.174.148.201:8090/graphql
curl http://103.174.148.201:8081/health
```

---

## User UI URL

```
http://103.174.148.201:3001
```

**Features Available:**
- ✅ View charging stations
- ✅ View vehicle data (SoC, Range, Model)
- ✅ Start charging
- ✅ Stop charging
- ✅ Real-time updates (every 5 seconds)
- ✅ Station status monitoring

---

## Configuration

**File:** `/opt/csms/citrineos-user-ui/.env.local`

```env
NEXT_PUBLIC_HASURA_URL=http://103.174.148.201:8090/v1/graphql
NEXT_PUBLIC_HASURA_ADMIN_SECRET=CitrineOS!
NEXT_PUBLIC_CITRINEOS_API_URL=http://103.174.148.201:8081
PORT=3001
```

---

## Test End-to-End Flow

1. Open http://103.174.148.201:3001
2. View station details & vehicle data
3. Click "Start Charging" button
4. Confirm action in modal
5. Watch real-time vehicle data updates
6. Click "Stop Charging" button
7. Confirm action
8. See status change to "Available"

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Port 3001 already in use | Change PORT in .env.local |
| GraphQL endpoint error | Verify hasura container: `docker ps \| grep hasura` |
| Station not showing | Check backend: `docker logs csms-core` |
| Vehicle data not updating | Verify station is connected: check OCPP logs |
| Cannot stop charging | Ensure transaction exists in database |

---

## Documentation

- [CITRINEOS_USER_UI_GUIDE.md](./CITRINEOS_USER_UI_GUIDE.md) - Complete guide
- [USER_UI_MIGRATION_COMPLETE.md](./USER_UI_MIGRATION_COMPLETE.md) - Migration details
- [OCPP_1.6J_CONNECTION_VERIFICATION_REPORT.md](./OCPP_1.6J_CONNECTION_VERIFICATION_REPORT.md) - Connection status

---

**Status:** ✅ Ready for Production  
**Updated:** 2026-02-07
