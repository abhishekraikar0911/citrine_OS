#!/usr/bin/env bash
# =============================================================================
# CitrineOS CSMS — Daily Lightweight Disk Monitor
# =============================================================================
# Version      : 2.0.0
# Author       : CitrineOS DevOps
# Schedule     : Every day at 08:00 AM UTC (via /etc/cron.d/csms_maintenance)
# Log File     : /var/log/csms_disk_monitor.log
#
# This script is a fast, minimal probe that:
#   - Checks current disk usage in < 1 second
#   - Sends WARNING alert if disk > 70%
#   - Sends CRITICAL alert AND triggers emergency cleanup if disk > 85%
#   - Logs an OK line if disk is healthy
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# CONFIGURATION
# ---------------------------------------------------------------------------
WARN_THRESHOLD="${CSMS_WARN_THRESHOLD:-70}"
CRITICAL_THRESHOLD="${CSMS_CRITICAL_THRESHOLD:-85}"
WEBHOOK_URL="${CSMS_ALERT_WEBHOOK:-}"
ALERT_EMAIL="${CSMS_ALERT_EMAIL:-}"
MAINTENANCE_SCRIPT="/opt/csms/scripts/prod_disk_maintenance.sh"
MONITOR_LOG="/var/log/csms_disk_monitor.log"
HOSTNAME_LABEL="$(hostname)"
TIMESTAMP="$(date -u '+%Y-%m-%d %H:%M:%S UTC')"

# ---------------------------------------------------------------------------
# HELPERS
# ---------------------------------------------------------------------------
log() { echo "[${TIMESTAMP}] $*"; }

get_disk_pct() {
  df / --output=pcent | tail -1 | tr -d ' %'
}

get_disk_summary() {
  local used avail total
  used=$(df -BG / --output=used | tail -1 | tr -d 'G ')
  avail=$(df -BG / --output=avail | tail -1 | tr -d 'G ')
  total=$(df -BG / --output=size | tail -1 | tr -d 'G ')
  echo "${used}G used / ${total}G total (${avail}G free)"
}

send_webhook() {
  local color="$1"
  local title="$2"
  local message="$3"

  if [[ -n "$WEBHOOK_URL" ]]; then
    curl -s -X POST -H 'Content-type: application/json' \
      --data "{
        \"attachments\": [{
          \"color\": \"${color}\",
          \"title\": \"${title}\",
          \"text\": \"${message}\",
          \"footer\": \"CitrineOS CSMS Disk Monitor | ${HOSTNAME_LABEL} | ${TIMESTAMP}\"
        }]
      }" "$WEBHOOK_URL" > /dev/null 2>&1 || \
      log "[WARN] Webhook delivery failed"
  fi
}

send_email() {
  local subject="$1"
  local body="$2"

  if [[ -n "$ALERT_EMAIL" ]]; then
    echo -e "Subject: [CitrineOS CSMS] ${subject}\n\n${body}\n\nTimestamp: ${TIMESTAMP}\nHostname: ${HOSTNAME_LABEL}" | \
      sendmail "$ALERT_EMAIL" 2>/dev/null || \
      log "[WARN] Email delivery failed"
  fi
}

# ---------------------------------------------------------------------------
# MAIN DISK CHECK
# ---------------------------------------------------------------------------
DISK_PCT=$(get_disk_pct)
DISK_SUMMARY=$(get_disk_summary)
TOP_DIRS=$(du -h --max-depth=2 /opt /var /root 2>/dev/null | sort -hr | head -5 | awk '{printf "  %s\t%s\n", $1, $2}')

if [[ "$DISK_PCT" -ge "$CRITICAL_THRESHOLD" ]]; then
  # ─── CRITICAL ─── >85% — Emergency cleanup triggered
  log "[CRITICAL] Disk at ${DISK_PCT}% — EMERGENCY CLEANUP TRIGGERED!"

  TITLE="🚨 CRITICAL: Disk Usage at ${DISK_PCT}% on ${HOSTNAME_LABEL}"
  MESSAGE="Disk: ${DISK_SUMMARY}\nThreshold breached: ${CRITICAL_THRESHOLD}%\nAUTO-CLEANUP TRIGGERED immediately.\n\nTop large directories:\n${TOP_DIRS}\n\nCheck /var/log/csms_maintenance.log for cleanup progress."

  send_webhook "danger" "$TITLE" "$MESSAGE"
  send_email "CRITICAL: Disk at ${DISK_PCT}% — Emergency Cleanup Triggered" "$MESSAGE"

  # Trigger full maintenance script in background (non-blocking)
  if [[ -x "$MAINTENANCE_SCRIPT" ]]; then
    log "Launching emergency maintenance run: $MAINTENANCE_SCRIPT"
    nohup nice -n 19 ionice -c 3 "$MAINTENANCE_SCRIPT" >> /var/log/csms_maintenance.log 2>&1 &
    log "Emergency maintenance script launched (PID: $!)"
  else
    log "[ERROR] Maintenance script not found or not executable: $MAINTENANCE_SCRIPT"
  fi

elif [[ "$DISK_PCT" -ge "$WARN_THRESHOLD" ]]; then
  # ─── WARNING ─── >70% — Early alert, scheduled cleanup will handle it
  log "[WARNING] Disk at ${DISK_PCT}% — above warning threshold (${WARN_THRESHOLD}%)"

  TITLE="⚠️ WARNING: Disk Usage at ${DISK_PCT}% on ${HOSTNAME_LABEL}"
  MESSAGE="Disk: ${DISK_SUMMARY}\nWarning threshold: ${WARN_THRESHOLD}%\n\nScheduled cleanup will run next Sunday at 03:00 UTC.\nNo immediate automatic action taken.\n\nTop large directories:\n${TOP_DIRS}"

  send_webhook "warning" "$TITLE" "$MESSAGE"
  send_email "WARNING: Disk at ${DISK_PCT}% — Approaching Critical" "$MESSAGE"

else
  # ─── OK ─── Healthy disk usage
  log "[OK] Disk at ${DISK_PCT}% — healthy (threshold: ${WARN_THRESHOLD}%) | ${DISK_SUMMARY}"
fi
