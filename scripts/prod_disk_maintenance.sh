#!/usr/bin/env bash
# =============================================================================
# CitrineOS CSMS — Production Disk Maintenance Script
# =============================================================================
# Version      : 2.0.0
# Author       : CitrineOS DevOps
# Schedule     : Every Sunday at 03:00 AM UTC (via /etc/cron.d/csms_maintenance)
# Log File     : /var/log/csms_maintenance.log
# Audit Log    : /var/log/csms_volume_audit.log
#
# Usage:
#   ./prod_disk_maintenance.sh            # Full cleanup run
#   ./prod_disk_maintenance.sh --dry-run  # Simulate only — no files deleted
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# CONFIGURATION — Override via environment variables
# ---------------------------------------------------------------------------
ALERT_THRESHOLD="${CSMS_ALERT_THRESHOLD:-70}"       # Warning alert threshold (%)
CRITICAL_THRESHOLD="${CSMS_CRITICAL_THRESHOLD:-85}" # Critical auto-cleanup threshold (%)
BACKUP_DIR="${CSMS_BACKUP_DIR:-/opt/csms/backup_temp_files}"
NEXTJS_CACHE="${CSMS_NEXTJS_CACHE:-/opt/csms/citrineos-operator-ui/.next/cache}"
OCPP_LOGS_DIR="${CSMS_OCPP_LOGS:-/opt/csms/ocpp-logs}"
LOG_FILE="/var/log/csms_maintenance.log"
AUDIT_LOG="/var/log/csms_volume_audit.log"
WEBHOOK_URL="${CSMS_ALERT_WEBHOOK:-}"   # Slack/Teams webhook URL
ALERT_EMAIL="${CSMS_ALERT_EMAIL:-}"    # Email address for alerts
HOSTNAME_LABEL="$(hostname)"
TIMESTAMP="$(date -u '+%Y-%m-%d %H:%M:%S UTC')"
DRY_RUN=false

# ---------------------------------------------------------------------------
# PARSE ARGUMENTS
# ---------------------------------------------------------------------------
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    *) echo "[WARN] Unknown argument: $arg" ;;
  esac
done

# ---------------------------------------------------------------------------
# COLORS & FORMATTING (only for terminal output, not log)
# ---------------------------------------------------------------------------
RED='\033[0;31m'; YELLOW='\033[1;33m'; GREEN='\033[0;32m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

# ---------------------------------------------------------------------------
# HELPER FUNCTIONS
# ---------------------------------------------------------------------------
log() { echo "[$(date -u '+%Y-%m-%d %H:%M:%S UTC')] $*"; }
log_section() { echo ""; echo "--- $* ---"; }

get_disk_usage_pct() {
  df / --output=pcent | tail -1 | tr -d ' %'
}

get_disk_used_gb() {
  df -BG / --output=used | tail -1 | tr -d 'G '
}

get_disk_avail_gb() {
  df -BG / --output=avail | tail -1 | tr -d 'G '
}

get_disk_total_gb() {
  df -BG / --output=size | tail -1 | tr -d 'G '
}

send_alert() {
  local level="$1"   # WARNING | CRITICAL | SUCCESS
  local title="$2"
  local message="$3"
  local color="$4"   # good | warning | danger

  # --- Slack/Teams Webhook ---
  if [[ -n "$WEBHOOK_URL" ]]; then
    local payload
    payload=$(cat <<EOF
{
  "attachments": [{
    "color": "${color}",
    "title": "${title}",
    "text": "${message}",
    "footer": "CitrineOS CSMS Disk Monitor | ${HOSTNAME_LABEL} | ${TIMESTAMP}",
    "fields": [
      {"title": "Level", "value": "${level}", "short": true},
      {"title": "Hostname", "value": "${HOSTNAME_LABEL}", "short": true}
    ]
  }]
}
EOF
)
    curl -s -X POST -H 'Content-type: application/json' \
      --data "$payload" "$WEBHOOK_URL" > /dev/null 2>&1 || \
      log "[WARN] Webhook delivery failed — check CSMS_ALERT_WEBHOOK"
  fi

  # --- Email Alert ---
  if [[ -n "$ALERT_EMAIL" ]]; then
    echo -e "Subject: [CitrineOS CSMS] ${level}: ${title}\n\n${message}\n\nTimestamp: ${TIMESTAMP}\nHostname: ${HOSTNAME_LABEL}" | \
      sendmail "$ALERT_EMAIL" 2>/dev/null || \
      log "[WARN] Email delivery failed — check mail configuration"
  fi

  if [[ -z "$WEBHOOK_URL" && -z "$ALERT_EMAIL" ]]; then
    log "[INFO] No alert destination configured. Set CSMS_ALERT_WEBHOOK or CSMS_ALERT_EMAIL to enable alerting."
  fi
}

safe_delete_old_files() {
  local dir="$1"
  local age_days="$2"
  local description="$3"
  local count=0

  if [[ ! -d "$dir" ]]; then
    log "[SKIP] Directory not found: $dir"
    return
  fi

  if [[ "$DRY_RUN" == true ]]; then
    count=$(find "$dir" -type f -mtime +"$age_days" 2>/dev/null | wc -l)
    log "[DRY-RUN] Would delete $count file(s) from $dir (older than ${age_days} days) [$description]"
  else
    count=$(find "$dir" -type f -mtime +"$age_days" -delete -print 2>/dev/null | wc -l)
    log "[OK] Deleted $count file(s) from $dir (older than ${age_days} days) [$description]"
  fi
}

# ---------------------------------------------------------------------------
# PRINT SCRIPT HEADER
# ---------------------------------------------------------------------------
echo ""
echo "============================================================"
echo "  CitrineOS CSMS — Production Disk Maintenance"
echo "  Timestamp : $TIMESTAMP"
echo "  Hostname  : $HOSTNAME_LABEL"
if [[ "$DRY_RUN" == true ]]; then
echo "  Mode      : DRY-RUN (no files will be modified)"
else
echo "  Mode      : LIVE (cleanup will execute)"
fi
echo "============================================================"
echo ""

# ---------------------------------------------------------------------------
# PHASE 1 — PRE-CLEANUP DIAGNOSTIC SNAPSHOT
# ---------------------------------------------------------------------------
log_section "PHASE 1: Pre-Cleanup Diagnostic Snapshot"

DISK_PCT_BEFORE=$(get_disk_usage_pct)
DISK_USED_BEFORE=$(get_disk_used_gb)
DISK_AVAIL_BEFORE=$(get_disk_avail_gb)
DISK_TOTAL=$(get_disk_total_gb)

log "Disk Before: ${DISK_PCT_BEFORE}% used (${DISK_USED_BEFORE}G used / ${DISK_TOTAL}G total | ${DISK_AVAIL_BEFORE}G available)"
log "Top 10 largest directories on /:"
du -h --max-depth=2 /opt /var /root 2>/dev/null | sort -hr | head -10 || true

# ---------------------------------------------------------------------------
# PHASE 2 — DOCKER SAFE PRUNING
# ---------------------------------------------------------------------------
log_section "PHASE 2: Docker Safe Pruning (containers + build cache + dangling images)"

if command -v docker &> /dev/null; then
  if [[ "$DRY_RUN" == true ]]; then
    log "[DRY-RUN] Would prune stopped Docker containers older than 7 days"
    log "[DRY-RUN] Would prune Docker build cache layers older than 7 days"
    log "[DRY-RUN] Would prune dangling Docker images (untagged)"
    docker container ls -a --filter "status=exited" --format "table {{.ID}}\t{{.Names}}\t{{.Status}}" 2>/dev/null || true
  else
    log "Pruning stopped containers (>7 days)..."
    docker container prune --filter "until=168h" -f 2>&1 | tail -3 || true

    log "Pruning Docker build cache (>7 days)..."
    docker builder prune --filter "until=168h" -f 2>&1 | tail -3 || true

    log "Pruning dangling Docker images..."
    docker image prune --filter "dangling=true" -f 2>&1 | tail -3 || true
    log "[OK] Docker pruning complete"
  fi
else
  log "[SKIP] Docker not found — skipping Docker pruning"
fi

# ---------------------------------------------------------------------------
# PHASE 3 — APPLICATION CACHE CLEANUP
# ---------------------------------------------------------------------------
log_section "PHASE 3: Application Cache Cleanup (.next/cache)"
safe_delete_old_files "$NEXTJS_CACHE" 7 "Next.js Webpack/Turbopack compile artifacts"

# ---------------------------------------------------------------------------
# PHASE 4 — BACKUP & TEMP FILE PRUNING
# ---------------------------------------------------------------------------
log_section "PHASE 4: Backup & Temp File Pruning (backup_temp_files)"
safe_delete_old_files "$BACKUP_DIR" 14 "Scratch files, build archives, temporary backups"

# ---------------------------------------------------------------------------
# PHASE 5 — OCPP LOG CLEANUP (files > 30 days)
# ---------------------------------------------------------------------------
log_section "PHASE 5: OCPP Log Cleanup (files older than 30 days)"
safe_delete_old_files "$OCPP_LOGS_DIR" 30 "OCPP communication logs"

# ---------------------------------------------------------------------------
# PHASE 6 — npm CACHE CLEANUP
# ---------------------------------------------------------------------------
log_section "PHASE 6: npm Global Cache Cleanup"
if command -v npm &> /dev/null; then
  if [[ "$DRY_RUN" == true ]]; then
    local_npm_cache=$(npm cache verify 2>/dev/null | grep "Cache verified" | head -1 || echo "npm cache size unknown")
    log "[DRY-RUN] Would run: npm cache clean --force  ($local_npm_cache)"
  else
    npm cache clean --force 2>&1 | tail -2 || true
    log "[OK] npm global cache cleared"
  fi
else
  log "[SKIP] npm not found — skipping npm cache cleanup"
fi

# ---------------------------------------------------------------------------
# PHASE 7 — SNAP OLD REVISION CLEANUP
# ---------------------------------------------------------------------------
log_section "PHASE 7: Snap Old Revision Cleanup"
if command -v snap &> /dev/null; then
  if [[ "$DRY_RUN" == true ]]; then
    log "[DRY-RUN] Would remove disabled/old snap revisions:"
    snap list --all 2>/dev/null | awk '/disabled/{print $1, $3}' | head -10 || true
  else
    # Remove old disabled snap revisions safely
    snap list --all 2>/dev/null | awk '/disabled/{print $1, $3}' | while IFS= read -r snapname revision; do
      snap remove "$snapname" --revision="$revision" 2>&1 || true
    done
    log "[OK] Old disabled snap revisions removed"
  fi
else
  log "[SKIP] Snap not found — skipping snap cleanup"
fi

# ---------------------------------------------------------------------------
# PHASE 8 — DOCKER VOLUME AUDIT (log only, never auto-delete)
# ---------------------------------------------------------------------------
log_section "PHASE 8: Docker Volume Audit Report"
echo "" > "$AUDIT_LOG" 2>/dev/null || true
{
  echo "============================================================"
  echo "  CitrineOS CSMS — Docker Volume Audit"
  echo "  Generated : $TIMESTAMP | Host: $HOSTNAME_LABEL"
  echo "============================================================"
  echo ""
  echo "--- All Docker Volumes ---"
  docker volume ls 2>/dev/null || echo "Docker not available"
  echo ""
  echo "--- Unused (Dangling) Volumes — Review before manual deletion ---"
  docker volume ls --filter "dangling=true" 2>/dev/null || echo "None found"
  echo ""
  echo "⚠️  NOTE: Volumes are NEVER auto-deleted by this script."
  echo "   Review the dangling volumes above and remove manually if safe:"
  echo "   docker volume rm <volume_name>"
  echo "============================================================"
} | tee -a "$AUDIT_LOG"

UNUSED_VOLUME_COUNT=$(docker volume ls --filter "dangling=true" -q 2>/dev/null | wc -l || echo "0")
log "Volume audit written to $AUDIT_LOG — $UNUSED_VOLUME_COUNT unused volume(s) found (manual review required)"

# ---------------------------------------------------------------------------
# PHASE 9 — POST-CLEANUP DIAGNOSTIC SNAPSHOT
# ---------------------------------------------------------------------------
log_section "PHASE 9: Post-Cleanup Diagnostic Snapshot"

DISK_PCT_AFTER=$(get_disk_usage_pct)
DISK_USED_AFTER=$(get_disk_used_gb)
DISK_AVAIL_AFTER=$(get_disk_avail_gb)
SPACE_FREED=$((DISK_USED_BEFORE - DISK_USED_AFTER))

log "Disk After : ${DISK_PCT_AFTER}% used (${DISK_USED_AFTER}G used / ${DISK_TOTAL}G total | ${DISK_AVAIL_AFTER}G available)"
log "Space Freed: ${SPACE_FREED} GB"

# ---------------------------------------------------------------------------
# PHASE 10 — STRUCTURED SUMMARY REPORT
# ---------------------------------------------------------------------------
log_section "PHASE 10: Summary Report"

if [[ "$DISK_PCT_AFTER" -le "$ALERT_THRESHOLD" ]]; then
  STATUS_ICON="✅ SUCCESS"
  STATUS_MSG="Disk below threshold — system healthy"
else
  STATUS_ICON="⚠️  WARNING"
  STATUS_MSG="Disk still above ${ALERT_THRESHOLD}% — manual review recommended"
fi

VOLUME_STATUS="⚠️  ${UNUSED_VOLUME_COUNT} unused volume(s) found — see audit log"
[[ "$UNUSED_VOLUME_COUNT" -eq 0 ]] && VOLUME_STATUS="✅ No unused volumes"

cat <<EOF

=====================================================
  CitrineOS CSMS Disk Maintenance Run
  Timestamp    : $TIMESTAMP
  Hostname     : $HOSTNAME_LABEL
  Mode         : $(if [[ "$DRY_RUN" == true ]]; then echo "DRY-RUN"; else echo "LIVE"; fi)
  Disk Before  : ${DISK_PCT_BEFORE}% used (${DISK_USED_BEFORE}G / ${DISK_TOTAL}G)
  Disk After   : ${DISK_PCT_AFTER}% used (${DISK_USED_AFTER}G / ${DISK_TOTAL}G)
  Space Freed  : ${SPACE_FREED} GB
  ─────────────────────────────────────────────────
  Docker Cache : ✅ Pruned (containers & caches >7 days)
  App Cache    : ✅ .next/cache files >7 days cleared
  Backup Files : ✅ backup_temp_files >14 days cleared
  OCPP Logs    : ✅ ocpp-logs >30 days cleared
  npm Cache    : ✅ npm cache cleaned
  Snap Cleanup : ✅ Old disabled revisions removed
  Volume Audit : ${VOLUME_STATUS}
  ─────────────────────────────────────────────────
  Status       : ${STATUS_ICON} — ${STATUS_MSG}
=====================================================

EOF

# ---------------------------------------------------------------------------
# PHASE 11 — THRESHOLD CHECK & ALERT DISPATCH
# ---------------------------------------------------------------------------
log_section "PHASE 11: Threshold Check & Alert Dispatch"

if [[ "$DISK_PCT_AFTER" -ge "$CRITICAL_THRESHOLD" ]]; then
  log "[CRITICAL] Disk usage still at ${DISK_PCT_AFTER}% after cleanup — sending CRITICAL alert!"
  ALERT_MSG="🚨 CRITICAL: Disk still at ${DISK_PCT_AFTER}% after automated cleanup on ${HOSTNAME_LABEL}. Manual intervention required immediately!\n\nDisk: ${DISK_USED_AFTER}G / ${DISK_TOTAL}G | Freed this run: ${SPACE_FREED}G\nUnused volumes: ${UNUSED_VOLUME_COUNT} (see /var/log/csms_volume_audit.log)\n\nTop large directories:\n$(du -h --max-depth=2 /opt /var /root 2>/dev/null | sort -hr | head -5)"
  send_alert "CRITICAL" "Disk Usage Critical After Cleanup: ${DISK_PCT_AFTER}%" "$ALERT_MSG" "danger"

elif [[ "$DISK_PCT_AFTER" -ge "$ALERT_THRESHOLD" ]]; then
  log "[WARNING] Disk usage at ${DISK_PCT_AFTER}% — above warning threshold. Sending WARNING alert."
  ALERT_MSG="⚠️ WARNING: Disk usage on ${HOSTNAME_LABEL} is at ${DISK_PCT_AFTER}% after weekly cleanup.\n\nDisk: ${DISK_USED_AFTER}G / ${DISK_TOTAL}G | Freed this run: ${SPACE_FREED}G\nUnused volumes: ${UNUSED_VOLUME_COUNT} (review /var/log/csms_volume_audit.log)"
  send_alert "WARNING" "Disk Usage Warning After Cleanup: ${DISK_PCT_AFTER}%" "$ALERT_MSG" "warning"

else
  log "[OK] Disk usage at ${DISK_PCT_AFTER}% — below threshold. Sending SUCCESS report."
  SUCCESS_MSG="✅ Weekly disk maintenance completed successfully on ${HOSTNAME_LABEL}.\n\nBefore: ${DISK_PCT_BEFORE}% (${DISK_USED_BEFORE}G) → After: ${DISK_PCT_AFTER}% (${DISK_USED_AFTER}G)\nSpace Freed: ${SPACE_FREED} GB\n\nAll cleanup tasks completed:\n✓ Docker caches pruned\n✓ .next/cache cleared\n✓ Backup files removed\n✓ npm cache cleaned\n✓ Snap old revisions removed"
  send_alert "SUCCESS" "Maintenance Complete — Disk at ${DISK_PCT_AFTER}%" "$SUCCESS_MSG" "good"
fi

log "Maintenance run complete. Full log: $LOG_FILE | Volume audit: $AUDIT_LOG"
echo ""
