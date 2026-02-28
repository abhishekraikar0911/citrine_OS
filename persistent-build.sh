#!/bin/bash

SESSION_NAME="citrine-ui-build"

# Check if screen is installed
if ! command -v screen &> /dev/null; then
    echo "Error: screen is not installed. Run 'sudo apt install screen -y' first."
    exit 1
fi

# Function to check session existence precisely
session_exists() {
    screen -list | grep -q "\.${SESSION_NAME}\s"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [start|attach|list|stop]"
    echo "  start  : Start a new build session (docker compose up --build)"
    echo "  attach : Attach to an existing build session"
    echo "  list   : List active screen sessions"
    echo "  stop   : Kill the build session"
}

case "$1" in
    start)
        if session_exists; then
            echo "Session '${SESSION_NAME}' already exists. Use '$0 attach' to view it."
        else
            echo "Starting build in screen session '${SESSION_NAME}'..."
            screen -dmS "$SESSION_NAME" bash -c "docker compose up --build; exec bash"
            echo "Build started background. Use '$0 attach' to monitor."
        fi
        ;;
    attach)
        if session_exists; then
            screen -r "$SESSION_NAME"
        else
            echo "No session named '${SESSION_NAME}' found."
        fi
        ;;
    list)
        screen -ls
        ;;
    stop)
        if session_exists; then
            screen -S "$SESSION_NAME" -X quit
            echo "Session '${SESSION_NAME}' stopped."
        else
            echo "No session named '${SESSION_NAME}' found."
        fi
        ;;
    *)
        show_usage
        ;;
esac
