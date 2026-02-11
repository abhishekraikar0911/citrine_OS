#!/bin/bash

# Start OCPP Communication Logging
echo "🟢 Starting OCPP Communication Logging..."

# Create log directory
mkdir -p /opt/csms/ocpp-logs

# Get current timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="/opt/csms/ocpp-logs/ocpp_communication_${TIMESTAMP}.log"

# Start capturing docker logs with timestamps
echo "📝 Logging to: $LOG_FILE"
echo "Log started at $(date)" > "$LOG_FILE"
echo "" >> "$LOG_FILE"

# Stream logs to file (runs in background)
docker logs -f csms-core >> "$LOG_FILE" 2>&1 &
DOCKER_LOG_PID=$!

# Save PID to temp file for later stopping
echo $DOCKER_LOG_PID > /tmp/ocpp_log_pid.txt

echo "✅ OCPP Communication Logging Started"
echo "   PID: $DOCKER_LOG_PID"
echo "   File: $LOG_FILE"
echo ""
echo "Commands to use:"
echo "  Monitor:  tail -f $LOG_FILE"
echo "  Grep OCPP: grep -i 'RemoteStart\|RemoteStop\|BootNotification\|Authorize' $LOG_FILE"
echo "  Stop:     . /opt/csms/STOP_OCPP_LOGGING.sh"
