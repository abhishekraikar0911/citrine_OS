# Quick Port Reference

## For microocpp Client Team

**Use this port:** `ws://103.174.148.201:8092`

```cpp
#define SECRET_CSMS_PORT 8092
#define SECRET_CSMS_URL "ws://103.174.148.201:8092"
```

## For Server Team

**Check connections:**
```bash
netstat -an | grep ":8092 " | grep ESTABLISHED
```

## Port Quick List

| Port | Service | Who Uses It |
|------|---------|-------------|
| **8092** | OCPP 1.6 WebSocket | ⚡ **microocpp clients** |
| 8081 | Core API | User UI, testing |
| 9310 | User UI | End users (browser) |
| 8090 | GraphQL | Internal queries |
| 22 | SSH | Admins |

**See PORT_CONFIGURATION.md for complete documentation**
