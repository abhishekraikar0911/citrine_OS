# OCPP Communication Logging

## Overview

A comprehensive OCPP protocol communication logging system has been implemented to capture all communication between the CitrineOS server and connected charging stations. This makes it easy to debug communication issues, monitor protocol flow, and troubleshoot problems.

## Features

- **Real-time Logging**: Captures all OCPP messages (Call, CallResult, CallError) in real-time as they are exchanged
- **Structured Format**: Messages are logged with:
  - ISO 8601 timestamps (with milliseconds)
  - Direction (INCOMING/OUTGOING)
  - OCPP Protocol version (ocpp1.6, ocpp2.0.1)
  - Message type and action
  - Station ID and Tenant ID
  - Complete message payload
  - Raw JSON message

- **Easy Filtering**: Search and filter logs by:
  - Station ID
  - Time range
  - Message type
  - Protocol version
  - Action/Command

- **File-based Storage**: All logs are stored in `./logs/ocpp-communication.log` with automatic rotation support

## Log File Location

```
CitrineOS Container:
/usr/local/apps/citrineos/logs/ocpp-communication.log

Host Machine:
Check your Docker volume mapping or:
docker cp <container-id>:/usr/local/apps/citrineos/logs/ocpp-communication.log ./logs/
```

## Log Format

Each log entry contains:

```
[2026-02-09T06:51:23.715Z] [INCOMING] [OCPP1.6] [Call] Station: 250822008C06 Tenant: 1 MessageID: abc123 Action: BootNotification
Payload:
{
  "chargePointModel": "Rivot ESP32 EVSE",
  "chargePointVendor": "Rivot Motors",
  "chargePointSerialNumber": "250822008C06",
  ...
}
----------------------------------------------------------------------------------------------------
```

### Log Entry Fields

| Field | Description | Example |
|-------|-------------|---------|
| Timestamp | ISO 8601 format with milliseconds | 2026-02-09T06:51:23.715Z |
| Direction | INCOMING (from charger) or OUTGOING (to charger) | INCOMING |
| Protocol | OCPP protocol version | OCPP1.6 or OCPP2.0.1 |
| MessageType | Type of OCPP message | Call, CallResult, CallError |
| Station | Charging station identifier | 250822008C06 |
| Tenant | Tenant/Organization ID | 1 |
| MessageID | Unique message correlation ID | abc123def456 |
| Action | OCPP action/command (for Calls) | BootNotification, RemoteStartTransaction, etc. |
| Payload | Complete message payload as JSON | {...} |

## Viewing Logs

### View the entire log file

```bash
# From container
docker exec csms-core tail -f /usr/local/apps/citrineos/logs/ocpp-communication.log

# Copy to host and view
docker cp csms-core:/usr/local/apps/citrineos/logs/ocpp-communication.log ./ocpp.log
cat ocpp.log
```

### View recent logs (last 50 lines)

```bash
docker exec csms-core tail -50 /usr/local/apps/citrineos/logs/ocpp-communication.log
```

### View logs in real-time (follow mode)

```bash
docker exec csms-core tail -f /usr/local/apps/citrineos/logs/ocpp-communication.log
```

### Search for specific station

```bash
# Find all communication for station 250822008C06
docker exec csms-core grep "Station: 250822008C06" /usr/local/apps/citrineos/logs/ocpp-communication.log

# Find a specific action
docker exec csms-core grep "Action: RemoteStartTransaction" /usr/local/apps/citrineos/logs/ocpp-communication.log
```

### Search for errors or rejections

```bash
# Find CallError messages
docker exec csms-core grep "CallError" /usr/local/apps/citrineos/logs/ocpp-communication.log

# Find rejected responses
docker exec csms-core grep -i "rejected\|denied\|failed" /usr/local/apps/citrineos/logs/ocpp-communication.log
```

### View logs by time range

```bash
# View logs between two timestamps
docker exec csms-core sed -n '/2026-02-09T06:50:00/,/2026-02-09T07:00:00/p' /usr/local/apps/citrineos/logs/ocpp-communication.log
```

### Count messages by type

```bash
# Count incoming messages
docker exec csms-core grep -c "INCOMING" /usr/local/apps/citrineos/logs/ocpp-communication.log

# Count calls by action
docker exec csms-core grep "Action:" /usr/local/apps/citrineos/logs/ocpp-communication.log | sort | uniq -c
```

## Programmatic Access

You can also access logs programmatically using the `OcppCommunicationLogger` class:

```typescript
import { OcppCommunicationLogger } from '@citrineos/util';

// Get logger instance
const logger = OcppCommunicationLogger.getInstance('./logs');

// Get last 100 log lines
const recentLogs = logger.getLastLogs(100);
console.log(recentLogs);

// Search logs
const results = logger.searchLogs('Station: 250822008C06');
console.log(results);

// Get all logs for a specific station
const stationLogs = logger.getStationLogs('250822008C06');
console.log(stationLogs);

// Clear logs
logger.clearLogs();

// Close logger when done
logger.close();
```

## Common Debugging Scenarios

### 1. Track a Remote Start/Stop Transaction

```bash
# Find when a RemoteStart request was sent
docker exec csms-core grep "RemoteStartTransaction" /usr/local/apps/citrineos/logs/ocpp-communication.log

# Follow the entire transaction flow
docker exec csms-core grep -A 5 -B 5 "MessageID: <message-id>" /usr/local/apps/citrineos/logs/ocpp-communication.log
```

### 2. Check Station Connection Issues

```bash
# Look for BootNotification messages
docker exec csms-core grep "BootNotification" /usr/local/apps/citrineos/logs/ocpp-communication.log

# Check for heartbeats
docker exec csms-core grep "Heartbeat" /usr/local/apps/citrineos/logs/ocpp-communication.log
```

### 3. Debug Authorization Issues

```bash
# Find Authorize requests and responses
docker exec csms-core grep -A 5 "Action: Authorize" /usr/local/apps/citrineos/logs/ocpp-communication.log

# Check for IdTag rejections
docker exec csms-core grep -A 5 "IdTagInfo" /usr/local/apps/citrineos/logs/ocpp-communication.log
```

### 4. Monitor Charging Profile Updates

```bash
# Find SetChargingProfile requests
docker exec csms-core grep "SetChargingProfile" /usr/local/apps/citrineos/logs/ocpp-communication.log

# Check responses
docker exec csms-core grep -A 3 "SetChargingProfile" /usr/local/apps/citrineos/logs/ocpp-communication.log
```

### 5. Identify Failed Requests

```bash
# Find all CallError messages
docker exec csms-core grep -B 10 "MessageType: CallError" /usr/local/apps/citrineos/logs/ocpp-communication.log

# Check error codes
docker exec csms-core grep -o '"errorCode": "[^"]*"' /usr/local/apps/citrineos/logs/ocpp-communication.log | sort | uniq -c
```

## Log Rotation

Currently, the log file grows continuously. For production use, consider:

1. **Implementing Log Rotation**: Use `logrotate` on Linux
2. **Size-based Rotation**: Modify `OcppCommunicationLogger` to rotate at certain file sizes
3. **Time-based Rotation**: Create new log files daily

Example logrotate configuration:

```bash
# /etc/logrotate.d/ocpp-communication
/opt/csms/logs/ocpp-communication.log {
    daily
    rotate 7
    compress
    delaycompress
    notifempty
    create 0640 root root
    sharedscripts
}
```

## Performance Considerations

- **Disk Space**: Monitor log file growth. Each message takes approximately 200-500 bytes depending on payload size
- **I/O Impact**: Logging is asynchronous and non-blocking
- **Real-time Performance**: Logging does not significantly impact message processing latency

## Troubleshooting

### Log file not being created

1. Check if `./logs` directory exists in the container:
   ```bash
   docker exec csms-core mkdir -p /usr/local/apps/citrineos/logs
   docker exec csms-core ls -la /usr/local/apps/citrineos/logs
   ```

2. Verify write permissions:
   ```bash
   docker exec csms-core touch /usr/local/apps/citrineos/logs/test.log
   ```

### Log file grows too large

1. Clear logs:
   ```bash
   docker exec csms-core truncate -s 0 /usr/local/apps/citrineos/logs/ocpp-communication.log
   ```

2. Compress old logs:
   ```bash
   docker exec csms-core gzip /usr/local/apps/citrineos/logs/ocpp-communication.log
   ```

### Missing messages in logs

- Ensure the logger is initialized: Check application startup logs
- Verify the container has access to the logs directory
- Check if the logger.close() was called prematurely

## Integration with Monitoring Systems

The OCPP communication logs can be integrated with monitoring tools:

- **ELK Stack**: Ship logs to Elasticsearch/Logstash/Kibana
- **Splunk**: Forward logs for centralized analysis
- **Datadog**: Monitor and alert on OCPP communication patterns
- **Custom Scripts**: Parse logs for metrics and alerts

Example:

```bash
# Stream logs to another tool
docker exec csms-core tail -f /usr/local/apps/citrineos/logs/ocpp-communication.log | nc logserver 5000
```

## Best Practices

1. **Regular Review**: Check logs regularly for anomalies
2. **Archive Old Logs**: Keep production logs for compliance/auditing
3. **Secure Storage**: Logs may contain sensitive information (IdTags, etc.)
4. **Performance Monitoring**: Track message latencies using timestamps
5. **Correlation IDs**: Use MessageID to trace a request through the entire system

---

## Quick Reference Commands

```bash
# Follow logs in real-time
docker exec csms-core tail -f /usr/local/apps/citrineos/logs/ocpp-communication.log

# Count total messages
docker exec csms-core wc -l /usr/local/apps/citrineos/logs/ocpp-communication.log

# Find messages for a specific station
docker exec csms-core grep "250822008C06" /usr/local/apps/citrineos/logs/ocpp-communication.log | tail -20

# Extract outgoing messages only
docker exec csms-core grep "OUTGOING" /usr/local/apps/citrineos/logs/ocpp-communication.log

# Find slow responses (by searching large payloads)
docker exec csms-core grep '"Action":' /usr/local/apps/citrineos/logs/ocpp-communication.log | head -20

# Search for specific actions
docker exec csms-core grep "RemoteStart\|RemoteStop\|Authorize" /usr/local/apps/citrineos/logs/ocpp-communication.log

# Watch for errors in real-time
docker exec csms-core tail -f /usr/local/apps/citrineos/logs/ocpp-communication.log | grep -i "error\|rejected\|failed"
```

---

**Last Updated**: 2026-02-09  
**Version**: 1.0  
**Author**: CitrineOS Debugging System
