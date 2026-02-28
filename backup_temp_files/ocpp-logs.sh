#!/bin/bash

# OCPP Communication Log Helper Script
# Usage: ./ocpp-logs.sh [command] [options]

CONTAINER="csms-core"
LOG_FILE="/usr/local/apps/citrineos/logs/ocpp-communication.log"
HOST_LOG_DIR="./logs"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_help() {
    cat << EOF
${BLUE}OCPP Communication Log Helper${NC}

Usage: $0 [command] [options]

${GREEN}Commands:${NC}
    tail        - Show last N lines (default: 50)
    follow      - Follow logs in real-time
    search      - Search logs for a pattern
    station     - Show logs for a specific station
    action      - Show logs for a specific action
    errors      - Show all errors and rejections
    count       - Count messages by type
    incoming    - Show only incoming messages
    outgoing    - Show only outgoing messages
    copy        - Copy logs to host machine
    clear       - Clear log file
    stats       - Show log statistics
    help        - Show this help message

${GREEN}Examples:${NC}
    $0 tail 100
    $0 follow
    $0 search "RemoteStart"
    $0 station 250822008C06
    $0 action BootNotification
    $0 errors
    $0 count
    $0 copy
    $0 stats

EOF
}

# Execute docker command on container
docker_exec() {
    docker exec "$CONTAINER" "$@"
}

# Check if container is running
check_container() {
    if ! docker ps --filter "name=$CONTAINER" --filter "status=running" -q | grep -q .; then
        echo -e "${RED}Error: Container '$CONTAINER' is not running${NC}"
        exit 1
    fi
}

# Tail logs
cmd_tail() {
    local lines=${1:-50}
    echo -e "${BLUE}Showing last $lines lines:${NC}\n"
    docker_exec tail -"$lines" "$LOG_FILE"
}

# Follow logs
cmd_follow() {
    echo -e "${YELLOW}Following logs (Ctrl+C to stop):${NC}\n"
    docker_exec tail -f "$LOG_FILE"
}

# Search logs
cmd_search() {
    if [ -z "$1" ]; then
        echo -e "${RED}Error: Please provide a search pattern${NC}"
        print_help
        exit 1
    fi
    echo -e "${BLUE}Searching for: $1${NC}\n"
    docker_exec grep -n "$1" "$LOG_FILE"
}

# Logs for specific station
cmd_station() {
    if [ -z "$1" ]; then
        echo -e "${RED}Error: Please provide a station ID${NC}"
        exit 1
    fi
    echo -e "${BLUE}Logs for station: $1${NC}\n"
    docker_exec grep "Station: $1" "$LOG_FILE"
}

# Logs for specific action
cmd_action() {
    if [ -z "$1" ]; then
        echo -e "${RED}Error: Please provide an action name${NC}"
        exit 1
    fi
    echo -e "${BLUE}Logs for action: $1${NC}\n"
    docker_exec grep "Action: $1" "$LOG_FILE"
}

# Show errors
cmd_errors() {
    echo -e "${RED}Errors and Rejections:${NC}\n"
    docker_exec grep -i "error\|rejected\|denied\|failed\|CallError" "$LOG_FILE"
}

# Count messages
cmd_count() {
    echo -e "${BLUE}Message Count Statistics:${NC}\n"
    
    local total=$(docker_exec wc -l < "$LOG_FILE")
    echo "Total log lines: $total"
    echo ""
    
    echo "By Direction:"
    echo "  Incoming: $(docker_exec grep -c "INCOMING" "$LOG_FILE")"
    echo "  Outgoing: $(docker_exec grep -c "OUTGOING" "$LOG_FILE")"
    echo ""
    
    echo "By Message Type:"
    echo "  Call: $(docker_exec grep -c "\[Call\]" "$LOG_FILE")"
    echo "  CallResult: $(docker_exec grep -c "\[CallResult\]" "$LOG_FILE")"
    echo "  CallError: $(docker_exec grep -c "\[CallError\]" "$LOG_FILE")"
    echo ""
    
    echo "By Protocol:"
    echo "  OCPP1.6: $(docker_exec grep -c "OCPP1.6" "$LOG_FILE")"
    echo "  OCPP2.0.1: $(docker_exec grep -c "OCPP2.0.1" "$LOG_FILE")"
}

# Show incoming messages
cmd_incoming() {
    echo -e "${BLUE}Incoming Messages (last 30):${NC}\n"
    docker_exec grep "INCOMING" "$LOG_FILE" | tail -30
}

# Show outgoing messages
cmd_outgoing() {
    echo -e "${BLUE}Outgoing Messages (last 30):${NC}\n"
    docker_exec grep "OUTGOING" "$LOG_FILE" | tail -30
}

# Copy logs to host
cmd_copy() {
    mkdir -p "$HOST_LOG_DIR"
    echo -e "${BLUE}Copying logs from container to $HOST_LOG_DIR...${NC}"
    
    if docker cp "$CONTAINER:$LOG_FILE" "$HOST_LOG_DIR/ocpp-communication.log" 2>/dev/null; then
        echo -e "${GREEN}✓ Logs copied successfully${NC}"
        echo "Location: $HOST_LOG_DIR/ocpp-communication.log"
        local size=$(ls -lh "$HOST_LOG_DIR/ocpp-communication.log" | awk '{print $5}')
        echo "Size: $size"
    else
        echo -e "${RED}✗ Failed to copy logs${NC}"
        exit 1
    fi
}

# Clear logs
cmd_clear() {
    echo -e "${YELLOW}WARNING: This will delete all logs!${NC}"
    read -p "Are you sure? (yes/no): " -r response
    if [ "$response" = "yes" ]; then
        docker_exec truncate -s 0 "$LOG_FILE"
        echo -e "${GREEN}✓ Logs cleared${NC}"
    else
        echo "Cancelled."
    fi
}

# Show statistics
cmd_stats() {
    echo -e "${BLUE}OCPP Communication Log Statistics${NC}\n"
    
    local file_size=$(docker_exec stat -c%s "$LOG_FILE" 2>/dev/null || echo "0")
    local file_size_mb=$((file_size / 1024 / 1024))
    
    echo "File Info:"
    echo "  Path: $LOG_FILE"
    echo "  Size: ${file_size_mb}MB"
    echo ""
    
    cmd_count
    echo ""
    
    local first_log=$(docker_exec head -1 "$LOG_FILE" | grep -o '2[0-9]\{3\}-[0-9]\{2\}-[0-9]\{2\}T[0-9:\.Z]*' | head -1)
    local last_log=$(docker_exec tail -20 "$LOG_FILE" | grep -o '2[0-9]\{3\}-[0-9]\{2\}-[0-9]\{2\}T[0-9:\.Z]*' | tail -1)
    
    if [ -n "$first_log" ]; then
        echo "Timeline:"
        echo "  First log: $first_log"
        echo "  Last log: $last_log"
    fi
    echo ""
    
    echo "Unique Stations:"
    docker_exec grep -o 'Station: [^ ]*' "$LOG_FILE" | sort -u | wc -l
    echo ""
    
    echo "Sample Stations:"
    docker_exec grep -o 'Station: [^ ]*' "$LOG_FILE" | sort -u | head -5
}

# Main command parser
main() {
    check_container
    
    case "${1:-help}" in
        tail)
            cmd_tail "$2"
            ;;
        follow)
            cmd_follow
            ;;
        search)
            cmd_search "$2"
            ;;
        station)
            cmd_station "$2"
            ;;
        action)
            cmd_action "$2"
            ;;
        errors)
            cmd_errors
            ;;
        count)
            cmd_count
            ;;
        incoming)
            cmd_incoming
            ;;
        outgoing)
            cmd_outgoing
            ;;
        copy)
            cmd_copy
            ;;
        clear)
            cmd_clear
            ;;
        stats)
            cmd_stats
            ;;
        help|--help|-h)
            print_help
            ;;
        *)
            echo -e "${RED}Unknown command: $1${NC}"
            print_help
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
