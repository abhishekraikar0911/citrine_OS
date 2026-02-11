# CitrineOS Port Configuration Standard

**Version:** 1.0  
**Last Updated:** 2026-02-11  
**Status:** Production Standard

---

## Port Allocation Strategy

This document defines the standardized port allocation for the CitrineOS CSMS platform. All services must adhere to this configuration.

---

## Available Ports

**VM Public/Private TCP Ports:**
- 22, 80, 443, 3000, 8080, 8081, 8082, 8092, 8443, 8444, 9310

---

## Current Port Assignments

### Core Infrastructure (Fixed - Do Not Change)

| Port | Service | Protocol | Access | Purpose |
|------|---------|----------|--------|---------|
| **22** | SSH | TCP | Private | Server administration and remote access |
| **5432** | PostgreSQL | TCP | Internal Only | CitrineOS database (Docker internal network) |
| **5672** | RabbitMQ | TCP | Internal Only | Message broker for OCPP modules |
| **15672** | RabbitMQ Management | HTTP | Private | RabbitMQ admin UI (optional external access) |

### OCPP WebSocket Servers (Client Connections)

| Port | Protocol | Security | TLS | Access | Purpose | Status |
|------|----------|----------|-----|--------|---------|--------|
| **8092** | OCPP 1.6 | Profile 0 | No | **Public** | **Primary WebSocket for microocpp clients** | ✅ **Active** |
| **8443** | OCPP 1.6 | Profile 2 | Yes | Public | Secure WebSocket with TLS certificate | ✅ Active |
| **8444** | OCPP 2.0.1 | Profile 3 | mTLS | Public | Mutual TLS for OCPP 2.0.1 clients | ✅ Active |

> [!IMPORTANT]
> **Primary Client Connection:** microocpp clients should connect to `ws://103.174.148.201:8092`

### API & Services

| Port | Service | Protocol | Access | Purpose |
|------|---------|----------|--------|---------|
| **8080** | CitrineOS Core API | HTTP | Internal | Core API (internal container port) |
| **8081** | CitrineOS Core API | HTTP | **Public** | External access to Core API (mapped from 8080) |
| **8082** | CitrineOS Module API | HTTP | Public | Module-specific API endpoints |
| **8090** | Hasura GraphQL | HTTP | Private | GraphQL API for database queries |

### User Interfaces

| Port | Service | Framework | Access | Purpose |
|------|---------|-----------|--------|---------|
| **9310** | User UI | Next.js | **Public** | End-user charging interface |
| **80** | HTTP Redirect | Nginx | Public | HTTP → HTTPS redirect (future) |
| **443** | HTTPS Gateway | Nginx | Public | SSL/TLS termination (future) |

### Object Storage

| Port | Service | Access | Purpose |
|------|---------|--------|---------|
| **9000** | MinIO API | Internal | S3-compatible object storage |
| **9001** | MinIO Console | Private | MinIO admin interface |

### Reserved for Future Use

| Port | Reserved For | Notes |
|------|-------------|-------|
| **3000** | Operator UI / Monitoring Dashboard | Next.js or React app |
| **10000-10500** | Dynamic OCPP Connections | Range for load balancing (if needed) |

---

## Port Usage Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    External Network (Public)                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │
    ┌─────────────────────────┼─────────────────────────┐
    │                         │                         │
    │                         │                         │
┌───▼────┐  ┌────▼─────┐  ┌──▼────┐  ┌────▼─────┐  ┌──▼────┐
│  8092  │  │   8443   │  │ 8444  │  │   8081   │  │  9310 │
│ OCPP16 │  │ OCPP16   │  │OCPP20 │  │ Core API │  │ User  │
│   WS   │  │  WSS     │  │  WSS  │  │   HTTP   │  │  UI   │
└───┬────┘  └────┬─────┘  └───┬───┘  └────┬─────┘  └───┬───┘
    │            │            │           │            │
    └────────────┴────────────┴───────────┴────────────┘
                              │
         ┌────────────────────┴────────────────────┐
         │      CitrineOS Core Container           │
         │  ┌──────────────────────────────────┐  │
         │  │ WebSocket Servers (9000, 9001)   │  │
         │  │ API Server (8080)                │  │
         │  │ Module APIs (8082, 8092)         │  │
         │  └──────────────────────────────────┘  │
         └─────────┬──────────────┬────────────────┘
                   │              │
         ┌─────────▼──────┐  ┌───▼──────────┐
         │   PostgreSQL   │  │   RabbitMQ   │
         │   :5432        │  │   :5672      │
         │  (internal)    │  │  (internal)  │
         └────────────────┘  └──────────────┘
```

---

## Connection Examples

### microocpp Client → CitrineOS

**Primary Connection (Recommended):**
```cpp
#define SECRET_CSMS_URL "ws://103.174.148.201:8092"
```

**Secure Connection (Production):**
```cpp
#define SECRET_CSMS_URL "wss://103.174.148.201:8443"
```

### User UI → Core API

```typescript
// .env.local
NEXT_PUBLIC_CITRINEOS_API_URL=http://103.174.148.201:8081
NEXT_PUBLIC_HASURA_URL=http://103.174.148.201:8090/v1/graphql
```

### API Testing

```bash
# Test RemoteStartTransaction
curl -X POST "http://103.174.148.201:8081/ocpp/1.6/evdriver/remoteStartTransaction" \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": ["250822008C06"],
    "request": {"connectorId": 1, "idTag": "TEST_TAG"},
    "tenantId": 1
  }'
```

---

## Security Configuration

### Public Ports (Internet-Facing)
- **8092:** OCPP 1.6 WebSocket (unsecured - for testing only)
- **8443:** OCPP 1.6 WebSocket (TLS secured)
- **8444:** OCPP 2.0.1 WebSocket (mTLS secured)
- **8081:** Core API (consider adding API authentication)
- **9310:** User UI (public access)
- **80/443:** HTTP/HTTPS (future web gateway)

### Private Ports (Internal Network Only)
- **22:** SSH (restrict to admin IPs)
- **8090:** Hasura GraphQL (internal only - has admin secret)
- **15672:** RabbitMQ Management (restrict access)
- **9000/9001:** MinIO (internal storage)

### Firewall Rules (Recommended)

```bash
# Allow SSH (restrict to admin IPs)
ufw allow from <ADMIN_IP> to any port 22

# Allow OCPP WebSocket
ufw allow 8092/tcp
ufw allow 8443/tcp
ufw allow 8444/tcp

# Allow Core API
ufw allow 8081/tcp

# Allow User UI
ufw allow 9310/tcp

# Allow HTTP/HTTPS (future)
ufw allow 80/tcp
ufw allow 443/tcp

# Deny all other ports by default
ufw default deny incoming
```

---

## Docker Port Mappings

### docker-compose.yml Port Configuration

```yaml
services:
  citrine:
    ports:
      - "8080:8080"   # Core API (internal)
      - "8081:8081"   # Core API (external mapping)
      - "8082:8082"   # Module API
      - "8092:8092"   # OCPP 1.6 WebSocket ⭐ PRIMARY
      - "8443:8443"   # OCPP 1.6 WSS
      - "8444:8444"   # OCPP 2.0.1 WSS
      - "10000-10500:10000-10500"  # Dynamic range

  amqp-broker:
    ports:
      - "5672:5672"   # RabbitMQ
      - "15672:15672" # RabbitMQ Management

  ocpp-db:
    ports:
      - "5432:5432"   # PostgreSQL (optional external)

  graphql-engine:
    ports:
      - "8090:8080"   # Hasura GraphQL

  minio:
    ports:
      - "9000:9000"   # MinIO API
      - "9001:9001"   # MinIO Console
```

---

## Configuration Files Reference

### CitrineOS Core (`/opt/csms/citrineos-core/Server/data/config.json`)

```json
{
  "centralSystem": {
    "host": "0.0.0.0",
    "port": 8080
  },
  "modules": {
    "configuration": {
      "websocketServers": [
        {
          "id": "4",
          "host": "0.0.0.0",
          "port": 8092,
          "protocol": "ocpp1.6",
          "securityProfile": 0,
          "allowUnknownChargingStations": true
        }
      ]
    }
  }
}
```

### User UI (`/opt/csms/citrineos-user-ui/.env.local`)

```env
NEXT_PUBLIC_CITRINEOS_API_URL=http://103.174.148.201:8081
NEXT_PUBLIC_HASURA_URL=http://103.174.148.201:8090/v1/graphql
PORT=9310
```

---

## Testing & Verification

### Port Connectivity Tests

```bash
# Test OCPP WebSocket port
telnet 103.174.148.201 8092

# Test Core API
curl http://103.174.148.201:8081/health

# Test User UI
curl http://103.174.148.201:9310

# List all listening ports
netstat -tuln | grep LISTEN
```

### WebSocket Connection Test

```bash
# Using wscat
wscat -c ws://103.174.148.201:8092/250822008C06
```

---

## Migration Guide

### From Port 9000 to Port 8092

**Client Side (microocpp):**
1. Update `secrets.h`:
   ```cpp
   #define SECRET_CSMS_PORT 8092
   #define SECRET_CSMS_URL "ws://103.174.148.201:8092"
   ```
2. Rebuild and flash firmware
3. Verify connection in serial monitor

**Server Side:**
- No changes needed - port 8092 already configured ✅

---

## Future Expansion Plan

### Phase 1: Current (2026-02)
- ✅ Port 8092: Primary OCPP 1.6 WebSocket
- ✅ Port 8081: Core API
- ✅ Port 9310: User UI

### Phase 2: Production Hardening (Q2 2026)
- Port 80/443: Add Nginx reverse proxy with SSL
- Port 8443: Enable TLS for production clients
- Remove port 8092 (unsecured) from public access

### Phase 3: Monitoring & Operations (Q3 2026)
- Port 3000: Operator dashboard
- Port 8090: Expose GraphQL with rate limiting
- Add Grafana/Prometheus on reserved ports

---

## Troubleshooting

### Common Port Issues

**Issue: "Connection refused" on port 8092**
- Check container is running: `docker ps | grep csms-core`
- Verify port mapping: `docker port csms-core 8092`
- Check firewall: `sudo ufw status | grep 8092`

**Issue: "Port already in use"**
- Find process: `lsof -i :8092`
- Check for conflicts with MinIO (ports 9000/9001)

**Issue: "WebSocket connection failed"**
- Verify CitrineOS config.json has port 8092 enabled
- Check container logs: `docker logs csms-core | grep 8092`
- Test with: `curl -i http://103.174.148.201:8092`

---

## Change Log

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2026-02-11 | 1.0 | Initial port configuration standard | System Admin |

---

## Approval & Compliance

This port configuration is the **official standard** for the CitrineOS project.

- All new services must request port assignments from this document
- Port changes require documentation update
- Production deployments must follow security guidelines

**Status:** ✅ Approved for Production Use
