#!/bin/bash
# ============================================================
# minio-sync.sh
# Syncs /opt/csms/bin/ → MinIO local/firmware/ bucket
# Runs every minute via cron to catch WinSCP uploads
# ============================================================

BIN_DIR="/opt/csms/bin"
MINIO_DEST="local/firmware"
LOG_FILE="/var/log/minio-sync.log"
MAX_LOG_LINES=500

# Find any .bin files in BIN_DIR not yet in MinIO and upload them
/usr/local/bin/mc mirror --overwrite "$BIN_DIR/" "$MINIO_DEST/" >> "$LOG_FILE" 2>&1

# Rotate log: keep only last 500 lines to prevent disk fill
tail -n "$MAX_LOG_LINES" "$LOG_FILE" > "${LOG_FILE}.tmp" && mv "${LOG_FILE}.tmp" "$LOG_FILE"
