#!/bin/bash
# =============================================================
# Firmware Auto-Upload Watcher — inotify based (ZERO polling)
# Watches /opt/csms/bin/ for new .bin files and automatically
# uploads them to MinIO using mc cp
# Triggered instantly by Linux kernel inotify — no CPU wasted
# =============================================================

WATCH_DIR="/opt/csms/bin"
MC_CONFIG="/opt/csms/.mc"
MC_DEST="local/firmware"
LOG_FILE="/opt/csms/bin/firmware-watcher.log"
UPLOADED_TRACKER="/opt/csms/bin/.uploaded_files"

touch "$UPLOADED_TRACKER"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "========================================="
log " Firmware Watcher STARTED (inotify mode)"
log " Watching: $WATCH_DIR"
log " Uploading to: $MC_DEST"
log " CPU usage: ZERO (kernel event-driven)"
log "========================================="

# inotifywait -m = keep running forever
# -e close_write = fires ONLY when WinSCP finishes writing the file (file handle closed)
# --format '%f' = output only the filename, nothing else
# This blocks here forever with zero CPU — kernel wakes it up only when a file arrives

# We use process substitution and file descriptor 3 to prevent commands inside
# the loop (like mc) from accidentally stealing stdin from inotifywait.

# We use process substitution and file descriptor 3 to prevent commands inside
# the loop (like mc) from accidentally stealing stdin from inotifywait.

while read -u 3 -r filename; do

    # Only process .bin files
    [[ "$filename" == *.bin ]] || continue

    filepath="$WATCH_DIR/$filename"

    # Skip if already uploaded
    if grep -qxF "$filename" "$UPLOADED_TRACKER" 2>/dev/null; then
        log "⏭️  Skipping $filename (already uploaded)"
        continue
    fi

    log "📦 New firmware detected: $filename"
    log "⬆️  Uploading to MinIO..."

    # < /dev/null ensures mc doesn't steal stdin
    result=$(mc --config-dir "$MC_CONFIG" cp "$filepath" "$MC_DEST/$filename" 2>&1 < /dev/null)
    exit_code=$?

    if [ $exit_code -eq 0 ]; then
        echo "$filename" >> "$UPLOADED_TRACKER"
        log "✅ SUCCESS: $filename → $MC_DEST/$filename"
        log "   URL: https://ocpp.rivotmotors.com/minio/firmware/$filename"
    else
        log "❌ FAILED: $filename"
        log "   Error: $result"
        log "   Drop the file again to retry."
    fi

done 3< <(inotifywait -m -e close_write -e moved_to -e create --format '%f' "$WATCH_DIR" 2>/dev/null)
