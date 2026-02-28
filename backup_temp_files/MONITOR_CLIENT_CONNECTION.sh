#!/bin/bash

# ============================================================================
# CitrineOS - Monitor Client Connection Script
# ============================================================================
# Run this script while the client team flashes their firmware to watch
# for the WebSocket connection from station 250822008C06
# ============================================================================

STATION_ID="250822008C06"
PORT="9000"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}=== Monitoring CitrineOS Server for Client Connection ===${NC}\n"
echo -e "${YELLOW}Station ID:${NC} ${STATION_ID}"
echo -e "${YELLOW}WebSocket Port:${NC} ${PORT}"
echo -e "${YELLOW}Server IP:${NC} 103.174.148.201\n"

echo -e "${BLUE}Waiting for client to connect after firmware flash...${NC}\n"

# Function to check WebSocket connections
check_websocket() {
    CONNECTIONS=$(netstat -an 2>/dev/null | grep ":${PORT} " | grep ESTABLISHED | wc -l)
    echo -e "${YELLOW}[$(date +%H:%M:%S)]${NC} Active WebSocket connections on port ${PORT}: ${CONNECTIONS}"
    
    if [ "$CONNECTIONS" -gt 0 ]; then
        echo -e "${GREEN}✅ Client connection detected!${NC}\n"
        netstat -an | grep ":${PORT} " | grep ESTABLISHED
        echo ""
    fi
}

# Function to check docker logs
check_logs() {
    echo -e "\n${BLUE}Recent CitrineOS logs for station ${STATION_ID}:${NC}"
    docker logs csms-core --tail 50 2>&1 | grep -i "${STATION_ID}" | tail -5
    echo ""
}

# Monitor loop
echo -e "${YELLOW}Starting monitoring (Ctrl+C to stop)...${NC}\n"
echo "-----------------------------------------------------------"

while true; do
    check_websocket
    
    # Every 10 seconds, check logs
    if [ $((SECONDS % 10)) -eq 0 ]; then
        check_logs
    fi
    
    sleep 2
done
