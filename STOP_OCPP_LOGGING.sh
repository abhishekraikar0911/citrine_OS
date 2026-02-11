#!/bin/bash

# Stop OCPP Communication Logging
echo "🔴 Stopping OCPP Communication Logging..."

if [ -f /tmp/ocpp_log_pid.txt ]; then
    PID=$(cat /tmp/ocpp_log_pid.txt)
    if ps -p $PID > /dev/null 2>&1; then
        kill $PID 2>/dev/null
        echo "✅ Logging stopped (PID $PID killed)"
    else
        echo "⚠️  Process not running"
    fi
    rm /tmp/ocpp_log_pid.txt
else
    echo "⚠️  No active logging process found"
fi

echo ""
echo "Latest log file:"
ls -lh /opt/csms/ocpp-logs/*.log 2>/dev/null | tail -1 | awk '{print "  " $9 " (" $5 ")"}'
