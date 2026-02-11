#!/bin/bash

# ============================================================================
# CitrineOS Remote Start/Stop End-to-End Test
# ============================================================================
# This script tests the complete RemoteStart → StartTransaction → RemoteStop
# → StopTransaction flow across client (ESP32) and server (CitrineOS).
#
# Prerequisites:
# 1. CitrineOS server running on http://citrine:8080 (or update CITRINE_API)
# 2. ESP32 client connected and visible to server
# 3. Monitor client serial output in parallel (in separate terminal)
# 4. Monitor server logs in parallel (in separate terminal)
# ============================================================================

# Configuration
CITRINE_API="http://localhost:8081"  # Update to your server URL
STATION_ID="250822008C06"            # Update to your test station ID
CONNECTOR_ID="1"                     # Update to your connector number
ID_TAG="TEST123"                     # ID token for test
TENANT_ID="1"                        # Default tenant

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== CitrineOS Remote Start/Stop Test ===${NC}\n"

# ============================================================================
# Step 1: Send RemoteStartTransaction
# ============================================================================
echo -e "${YELLOW}[STEP 1]${NC} Sending RemoteStartTransaction to ${STATION_ID}..."
echo -e "${BLUE}Request Details:${NC}"
echo "  Station ID: $STATION_ID"
echo "  Connector ID: $CONNECTOR_ID"
echo "  ID Tag: $ID_TAG"
echo ""

REMOTE_START_RESPONSE=$(curl -s -X POST \
  "$CITRINE_API/ocpp/1.6/evdriver/remoteStartTransaction" \
  -H "Content-Type: application/json" \
  -d "{
    \"identifier\": [\"$STATION_ID\"],
    \"request\": {
      \"connectorId\": $CONNECTOR_ID,
      \"idTag\": \"$ID_TAG\"
    },
    \"tenantId\": $TENANT_ID
  }")

echo -e "${BLUE}Server Response:${NC}"
echo "$REMOTE_START_RESPONSE" | jq '.' 2>/dev/null || echo "$REMOTE_START_RESPONSE"
echo ""

# Check if request was successful
if echo "$REMOTE_START_RESPONSE" | grep -q "success"; then
  echo -e "${GREEN}✅ RemoteStartTransaction sent successfully${NC}\n"
else
  echo -e "${RED}⚠️  RemoteStartTransaction may have failed. Check server logs.${NC}\n"
fi

# ============================================================================
# Step 2: Wait for client to accept and start transaction
# ============================================================================
echo -e "${YELLOW}[STEP 2]${NC} Waiting for client response and StartTransaction..."
echo -e "${BLUE}Expected Client Serial Output (ESP32):${NC}"
cat <<'EOF'
  [OCPP] 📨 Received RemoteStartTransaction
  [OCPP] ✅ RemoteStartTransaction accepted (latching)
  [OCPP] 🚀 StartTransaction queued to server
  [OCPP] ↔️  StartTransaction sent (txId: ###)
EOF
echo ""
echo -e "${BLUE}Expected Server Log Output (CitrineOS):${NC}"
cat <<'EOF'
  [EVDriver] RemoteStartTransactionResponse received
  [EVDriver] RemoteStartTransaction accepted by station 250822008C06
  [Transactions] StartTransactionRequest received
EOF
echo ""
echo -e "${YELLOW}⏳ Sleeping 10 seconds for transaction to settle...${NC}"
sleep 10
echo ""

# ============================================================================
# Step 3: Query database to get transaction ID
# ============================================================================
echo -e "${YELLOW}[STEP 3]${NC} Querying active transactions in database..."
echo -e "${BLUE}Looking for active transaction on ${STATION_ID}...${NC}\n"

# Note: This requires direct DB access. If using Docker, adjust accordingly.
# Example using docker exec (requires running CitrineOS in Docker):
TRANSACTION_ID=$(curl -s -X GET \
  "$CITRINE_API/api/transactions?stationId=$STATION_ID&isActive=true" \
  -H "Content-Type: application/json" 2>/dev/null | jq -r '.[0].transactionId // empty')

if [ -z "$TRANSACTION_ID" ]; then
  echo -e "${RED}❌ Could not find active transaction. Options:${NC}"
  echo "   1. Check server logs for 'StartTransaction received'"
  echo "   2. Query database directly: SELECT id, transactionId FROM transactions WHERE stationId='$STATION_ID' AND isActive=true;"
  echo "   3. Manually provide transaction ID for RemoteStop test"
  echo ""
  read -p "Enter transaction ID from database (or press Ctrl+C to abort): " TRANSACTION_ID
else
  echo -e "${GREEN}✅ Found Transaction ID: $TRANSACTION_ID${NC}\n"
fi

# ============================================================================
# Step 4: Send RemoteStopTransaction
# ============================================================================
echo -e "${YELLOW}[STEP 4]${NC} Sending RemoteStopTransaction..."
echo -e "${BLUE}Request Details:${NC}"
echo "  Station ID: $STATION_ID"
echo "  Transaction ID: $TRANSACTION_ID"
echo ""

REMOTE_STOP_RESPONSE=$(curl -s -X POST \
  "$CITRINE_API/ocpp/1.6/evdriver/remoteStopTransaction" \
  -H "Content-Type: application/json" \
  -d "{
    \"identifier\": [\"$STATION_ID\"],
    \"request\": {
      \"transactionId\": $TRANSACTION_ID
    },
    \"tenantId\": $TENANT_ID
  }")

echo -e "${BLUE}Server Response:${NC}"
echo "$REMOTE_STOP_RESPONSE" | jq '.' 2>/dev/null || echo "$REMOTE_STOP_RESPONSE"
echo ""

if echo "$REMOTE_STOP_RESPONSE" | grep -q "success"; then
  echo -e "${GREEN}✅ RemoteStopTransaction sent successfully${NC}\n"
else
  echo -e "${RED}⚠️  RemoteStopTransaction may have failed. Check server logs.${NC}\n"
fi

# ============================================================================
# Step 5: Wait for completion
# ============================================================================
echo -e "${YELLOW}[STEP 5]${NC} Waiting for transaction to stop..."
echo -e "${BLUE}Expected Client Serial Output (ESP32):${NC}"
cat <<'EOF'
  [OCPP] 🛑 RemoteStop → ending transaction
  [OCPP] ✅ StopTransaction queued to server
  [OCPP] ⏹️  Transaction STOPPED and UNLOCKED
  [GATE] 🔒 HARD GATE CLOSED
EOF
echo ""
echo -e "${BLUE}Expected Server Log Output (CitrineOS):${NC}"
cat <<'EOF'
  [EVDriver] RemoteStopTransaction accepted by station 250822008C06
  [Transactions] StopTransactionRequest received
  [Transactions] Transaction closed
EOF
echo ""
echo -e "${YELLOW}⏳ Sleeping 5 seconds for transaction to close...${NC}"
sleep 5
echo ""

# ============================================================================
# Step 6: Verify final state
# ============================================================================
echo -e "${YELLOW}[STEP 6]${NC} Verifying final transaction state..."

FINAL_TRANSACTION=$(curl -s -X GET \
  "$CITRINE_API/api/transactions?stationId=$STATION_ID&transactionId=$TRANSACTION_ID" \
  -H "Content-Type: application/json" 2>/dev/null | jq '.[0]')

if [ ! -z "$FINAL_TRANSACTION" ] && [ "$FINAL_TRANSACTION" != "null" ]; then
  IS_ACTIVE=$(echo "$FINAL_TRANSACTION" | jq -r '.isActive')
  echo -e "${BLUE}Transaction State:${NC}"
  echo "$FINAL_TRANSACTION" | jq '.' 2>/dev/null || echo "$FINAL_TRANSACTION"
  
  if [ "$IS_ACTIVE" = "false" ]; then
    echo -e "\n${GREEN}✅ SUCCESS! Transaction properly closed (isActive=false)${NC}"
  else
    echo -e "\n${YELLOW}⚠️  Transaction still active. Check if StopTransaction was received.${NC}"
  fi
else
  echo -e "${RED}❌ Could not retrieve final transaction state${NC}"
fi

echo ""
echo -e "${BLUE}=== Test Complete ===${NC}"
echo ""
echo "Summary of what to verify:"
echo "1. Client serial shows 🛑 RemoteStop and ✅ StopTransaction messages"
echo "2. Server logs show RemoteStop acceptance and StopTransaction receipt"
echo "3. Database shows transaction with isActive=false and stopTransaction record"
echo ""
