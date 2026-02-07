# CitrineOS CSMS Setup Guide

## Overview
CitrineOS is an open-source Central System Management System (CSMS) for managing EV charging infrastructure using OCPP 2.0.1 protocol.

## Repository Structure

Your workspace contains all CitrineOS repositories:

- **citrineos-core/** - Main CSMS server with OCPP 2.0.1 implementation
- **citrineos-operator-ui/** - Web-based operator interface (Next.js)
- **citrineos-ocpi/** - OCPI protocol integration for roaming
- **citrineos-payment/** - Payment processing service (Python/FastAPI)
- **citrineos.github.io/** - Documentation website
- **citrineos/** - Main project documentation and governance

## Prerequisites
- Docker & Docker Compose
- Node.js v24.4.1+ (for local development)
- Git

## Quick Start with Docker

### Option 1: Using Official Server Docker Compose (Recommended)

```bash
cd /opt/csms/citrineos-core/Server
docker compose up -d
```

This will start:
- **CitrineOS Server** (ports: 8080, 8081, 8082, 9229, 8092)
- **PostgreSQL Database** (port: 5432)
- **RabbitMQ Message Broker** (ports: 5672, 15672)
- **MinIO Object Storage** (ports: 9000, 9001)
- **Hasura GraphQL Engine** (port: 8090)

### Option 2: Using Simplified Setup

```bash
cd /opt/csms
docker compose up -d
```

## Service Endpoints

Once running, access:

- **OCPP 2.0.1 WebSocket (no auth)**: `ws://localhost:8081`
- **OCPP 1.6J WebSocket (no auth)**: `ws://localhost:8092`
- **OCPP 2.0.1 WebSocket (with auth)**: `ws://localhost:8082`
- **REST API & Swagger**: `http://localhost:8080/docs`
- **RabbitMQ Management**: `http://localhost:15672` (guest/guest)
- **Hasura Console**: `http://localhost:8090`
- **MinIO Console**: `http://localhost:9001` (minioadmin/minioadmin)

## Connecting a Charging Station

OCPP 2.0.1 (default, security profile 0):
```
ws://YOUR_SERVER_IP:8081/STATION_ID
```

Example:
```
ws://localhost:8081/cp001
```

OCPP 1.6J (phase 1 compatibility, security profile 0):
```
ws://YOUR_SERVER_IP:8092/STATION_ID
```

Optional secure OCPP 2.0.1 endpoints (after Phase 2 hardening):
- `wss://YOUR_SERVER_IP:8082/STATION_ID` (security profile 1, TLS at proxy/LB)
- `wss://YOUR_SERVER_IP:8443/STATION_ID` (security profile 2, mTLS with server certs)
- `wss://YOUR_SERVER_IP:8444/STATION_ID` (security profile 3, full chain in CitrineOS)

## Phased Migration Execution Plan (SteVe -> CitrineOS -> Payments/UI)

This roadmap implements a zero-downtime friendly migration in four phases:
1. Stability first with OCPP 1.6J compatibility.
2. Protocol upgrade to native OCPP 2.0.1.
3. Payments once transactions are stable.
4. Admin and user UI rollout.

During Phases 1 and 2, chargers operate only on security profile 0 (ws). TLS/mTLS is enabled only after protocol stability.

### Phase 0 - Preparation and Baseline

Goal: run CitrineOS in parallel and define a safe rollback.

Steps:
1. Export station inventory from SteVe (stationId, EVSE IDs, connector counts, site metadata).
2. Start CitrineOS core:
   ```
   cd /opt/csms/citrineos-core/Server
   docker compose up -d
   ```
3. Verify health:
   ```
   docker compose ps
   curl -f http://localhost:8080/docs
   ```
4. Confirm OCPP ports and protocol config in `citrineos-core/Server/src/config/envs/docker.ts`.
5. Keep these settings for Phases 1-2. Set `allowUnknownChargingStations=true` for websocket servers and `authProvider.localByPass=true`.
6. Define a pilot group (3-5 chargers) and a rollback playbook (switch endpoint back to SteVe).

Exit criteria:
- CitrineOS healthy, Swagger reachable at `http://<csms-host>:8080/docs`.
- RabbitMQ running and reachable.
- Pilot list and rollback steps documented.

### Phase 1 - OCPP 1.6J Pilot on CitrineOS

Goal: replace SteVe for a pilot subset using OCPP 1.6J with no payments and no UI, via the CitrineOS compatibility endpoint.

Steps:
1. Reconfigure pilot chargers to `ws://<csms-host>:8092/<stationId>`.
2. Validate OCPP 1.6 flows: BootNotification, Heartbeat, StartTransaction, StopTransaction, MeterValues, StatusNotification.
3. Validate RemoteStart/RemoteStop via API:
   ```
   curl -X POST "http://localhost:8080/ocpp/1.6/evdriver/remoteStartTransaction?identifier=cp001&tenantId=1" \
     -H "Content-Type: application/json" \
     -d '{"connectorId":1,"idTag":"TEST_TAG"}'
   ```
   ```
   curl -X POST "http://localhost:8080/ocpp/1.6/evdriver/remoteStopTransaction?identifier=cp001&tenantId=1" \
     -H "Content-Type: application/json" \
     -d '{"transactionId":12345}'
   ```
4. Verify data correctness:
   ```
   curl "http://localhost:8080/data/transactions/transaction?stationId=cp001"
   ```

Success criteria:
- Charger comes online within 60 seconds.
- At least 3 consecutive sessions complete with no reconnect loops.
- Meter values and energy totals align with the charger UI.
- No duplicate transaction IDs created across reconnects.

Expansion:
- Move remaining chargers in 2-3 waves, each wave separated by 24-48 hours of clean operation.

### Phase 2 - Upgrade to Native OCPP 2.0.1

Goal: upgrade chargers and CSMS to native 2.0.1 flows before enabling payments.

Steps:
1. Upgrade charger firmware to OCPP 2.0.1 and point to `ws://<csms-host>:8081/<stationId>`.
2. Validate OCPP 2.0.1 flows: BootNotification, TransactionEvent (Started, Updated, Ended), StatusNotification, Heartbeat.
3. Validate RequestStartTransaction and RequestStopTransaction:
   ```
   curl -X PUT "http://localhost:8080/data/evdriver/authorization?idToken=TEST_TOKEN&type=Central" \
     -H "Content-Type: application/json" \
     -d '{"idToken":{"idToken":"TEST_TOKEN","type":"Central"},"idTokenInfo":{"status":"Accepted"}}'
   ```
   ```
   curl -X POST "http://localhost:8080/ocpp/2.0.1/evdriver/requestStartTransaction?identifier=cp001&tenantId=1" \
     -H "Content-Type: application/json" \
     -d '{"remoteStartId":1001,"idToken":{"idToken":"TEST_TOKEN","type":"Central"},"evseId":1}'
   ```
   ```
   curl -X POST "http://localhost:8080/ocpp/2.0.1/evdriver/requestStopTransaction?identifier=cp001&tenantId=1" \
     -H "Content-Type: application/json" \
     -d '{"transactionId":"<transactionId>"}'
   ```
4. Upgrade remaining chargers in waves once pilot stability is confirmed.

Security hardening (after stability):
1. Switch to secure websocket endpoints (8082, 8443, 8444) as needed.
2. Set `allowUnknownChargingStations=false` for all active websocket servers in `citrineos-core/Server/src/config/envs/docker.ts`.
3. Set `authProvider.localByPass=false` to enforce auth.
4. Restart services after config changes.

Success criteria:
- TransactionEvent is the only transaction flow in use.
- No OCPP 1.6 fallback in logs.
- Stable sessions for 7 days on OCPP 2.0.1.

### Phase 3 - Payments via CitrineOS Payment Service

Goal: add payment flows without changing OCPP logic. Prerequisite: Phase 2 is stable and TransactionEvent is working.
Safety: the payment service never directly controls power flow; it only triggers `requestStartTransaction` after successful authorization.

Steps:
1. Configure `citrineos-payment/.env` with these required values:
   ```
   CITRINEOS_MESSAGE_API_URL=http://<csms-host>:8080/ocpp/2.0.1
   CITRINEOS_DATA_API_URL=http://<csms-host>:8080/data
   MESSAGE_BROKER_HOST=<rabbitmq-host>
   DB_HOST=<citrineos-db-host>
   STRIPE_API_KEY=<stripe_test_key>
   STRIPE_ENDPOINT_SECRET_ACCOUNT=<stripe_webhook_secret>
   STRIPE_ENDPOINT_SECRET_CONNECT=<stripe_webhook_secret>
   ```
2. Start payment service:
   ```
   cd /opt/csms/citrineos-payment
   python main.py
   ```
   The service creates its tables on startup using the `payment_` prefix.
   The service expects RabbitMQ exchange `citrineos` and headers `action=TransactionEvent` and `action=StatusNotification` (state=1).
3. Enable Directus for QR workflows:
   ```
   cd /opt/csms/citrineos-core/Server
   docker compose -f docker-compose-directus.yml up -d
   ```
   Then set `CITRINEOS_DIRECTUS_*` and `CITRINEOS_SCAN_AND_CHARGE=true` in `citrineos-payment/.env`.
4. Start the payment frontend. Option A: use `citrineos-payment/start-payment-ui.sh` (update host/IP in the script first). Option B: run `npm install` in `citrineos-payment/frontend` and `npm start`.

Success criteria:
- Payment triggers charging within 30 seconds.
- Stop transaction yields correct billing.
- Failed payment never starts charging.

### Phase 4 - Admin UI and User UI

Goal: deliver operational visibility and end-user charging experience.

Admin UI (Operator UI):
1. Set `NEXT_PUBLIC_API_URL=http://<csms-host>:8090/v1/graphql` in `citrineos-operator-ui/.env.local`.
2. Start the Operator UI:
   ```
   cd /opt/csms/citrineos-operator-ui
   docker compose up -d
   ```
3. Verify charger list, live status, sessions, revenue, and faults.

User UI (Payment Frontend):
1. Use the payment frontend from Phase 3 for QR scan and charging.
2. Branding and receipt flow can be customized after stability.

Success criteria:
- Operator UI reflects live status within 30 seconds.
- User UI shows energy and cost within 60 seconds.

## Configuration

### Environment Variables

Key environment variables (set in docker-compose.yml):

```yaml
APP_NAME: 'all'                    # Run all modules
APP_ENV: 'docker'                  # Environment mode
DB_STRATEGY: 'migrate'             # Use migrations for DB schema
BOOTSTRAP_CITRINEOS_DATABASE_HOST: 'ocpp-db'
BOOTSTRAP_CITRINEOS_CONFIG_FILENAME: 'config.json'
BOOTSTRAP_CITRINEOS_FILE_ACCESS_TYPE: 'local'
```

### Custom Configuration

Configuration files are located in:
- `/opt/csms/citrineos-core/Server/src/config/envs/`
  - `local.ts` - Local development
  - `docker.ts` - Docker environment
  - `swarm.docker.ts` - Docker Swarm

## Database Management

### Run Migrations
```bash
cd /opt/csms/citrineos-core
npm run migrate
```

### Sync Database (Development Only)
```bash
npm run sync-db        # Sync without dropping tables
npm run force-sync-db  # Drop and recreate all tables
```

## Testing with EVerest Simulator

Start EVerest charging station simulator:
```bash
cd /opt/csms/citrineos-core/Server
npm run start-everest
```

This connects a simulated charging station to `ws://host.docker.internal:8081/cp001`

## API Usage Examples

### Send a Command to Charging Station

```bash
curl -X POST http://localhost:8080/data/configuration/setVariables \
  -H "Content-Type: application/json" \
  -d '{
    "stationId": "cp001",
    "setVariableData": [{
      "attributeValue": "true",
      "component": {"name": "ChargingStation"},
      "variable": {"name": "Available"}
    }]
  }'
```

### Query Charging Station Status

```bash
curl http://localhost:8080/data/transactions/status?stationId=cp001
```

## Monitoring & Logs

### View Container Logs
```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f citrine
```

### Check Service Health
```bash
docker compose ps
```

## Troubleshooting

### Services Not Starting

1. Check logs:
```bash
docker compose logs citrine
```

2. Verify database is healthy:
```bash
docker compose ps ocpp-db
```

3. Restart services:
```bash
docker compose restart
```

### Database Connection Issues

Ensure PostgreSQL is running and healthy:
```bash
docker compose exec ocpp-db pg_isready -U citrine
```

### Port Conflicts

If ports are already in use, modify the port mappings in `docker-compose.yml`:
```yaml
ports:
  - "8080:8080"  # Change left side: "NEW_PORT:8080"
```

## Development Setup

### Local Development (Without Docker)

1. Install Node.js v24.4.1+
2. Install dependencies:
```bash
cd /opt/csms/citrineos-core
npm run install-all
```

3. Build project:
```bash
npm run build
```

4. Start services (PostgreSQL, RabbitMQ) via Docker:
```bash
cd Server
docker compose up -d ocpp-db amqp-broker
```

5. Run server locally:
```bash
cd Server
npm run start
```

## Project Structure

```
citrineos-core/
├── 00_Base/           # Base OCPP schemas and interfaces
├── 01_Data/           # Data models and database layer
├── 02_Util/           # Utilities (message broker, cache)
├── 03_Modules/        # OCPP functional modules
│   ├── Certificates/
│   ├── Configuration/
│   ├── EVDriver/
│   ├── Monitoring/
│   ├── OcppRouter/
│   ├── Reporting/
│   ├── SmartCharging/
│   ├── Tenant/
│   └── Transactions/
├── Server/            # Main server application
└── migrations/        # Database migrations
```

## Additional Resources

- **Official Documentation**: https://citrineos.github.io
- **GitHub Repository**: https://github.com/citrineos/citrineos-core
- **OCPP 2.0.1 Specification**: https://www.openchargealliance.org/

## Common Commands

```bash
# Start services
docker compose up -d

# Stop services
docker compose down

# View logs
docker compose logs -f

# Rebuild containers
docker compose up -d --build

# Clean restart
docker compose down -v
docker compose up -d

# Run migrations
npm run migrate

# Run tests
npm test

# Lint code
npm run lint

# Format code
npm run prettier
```

## Additional Components

### Operator UI

Web interface for managing charging stations:

Set `NEXT_PUBLIC_API_URL` in `citrineos-operator-ui/.env.local` to the Hasura GraphQL endpoint (default `http://localhost:8090/v1/graphql`).

```bash
cd /opt/csms/citrineos-operator-ui
docker compose up -d
```

Access at: `http://localhost:3000`

### OCPI Integration

For roaming and inter-network communication:

```bash
cd /opt/csms/citrineos-ocpi
npm install
npm run build
cd Server
docker compose up -d
```

### Payment Service

Python-based payment processing:

Before starting, set required values in `citrineos-payment/.env` (see Phase 3 above). Ensure `CITRINEOS_MESSAGE_API_URL` has no trailing slash.

```bash
cd /opt/csms/citrineos-payment
pip install -r requirements.txt
python main.py
```

Or with Docker:
```bash
docker build -t citrineos-payment .
docker run -p 8000:8000 citrineos-payment
```

## Next Steps

1. Start the core services using Docker Compose
2. Access the Swagger UI at http://localhost:8080/docs
3. Start the Operator UI for web management
4. Connect a charging station or use EVerest simulator
5. Monitor messages via RabbitMQ Management UI
6. Query data using Hasura GraphQL Console
