#!/bin/bash
# Quick UI Testing Script for CitrineOS

echo "======================================"
echo "CitrineOS User UI - Quick Test"
echo "======================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Step 1: Checking Docker Services...${NC}"
echo "---"
docker ps | grep -E "csms-core|csms-postgres|graphql-engine"
echo ""

echo -e "${YELLOW}Step 2: Checking Charging Station Status...${NC}"
echo "---"
docker exec csms-postgres psql -U citrine -d citrine -c \
  "SELECT id, \"isOnline\", protocol FROM \"ChargingStations\" WHERE id = '250822008C06';"
echo ""

echo -e "${YELLOW}Step 3: Current Connector Status...${NC}"
echo "---"
docker exec csms-postgres psql -U citrine -d citrine -c \
  "SELECT \"connectorId\", status FROM \"Connectors\" WHERE \"stationId\" = '250822008C06';"
echo ""

echo -e "${YELLOW}Step 4: Check for Active Transactions...${NC}"
echo "---"
docker exec csms-postgres psql -U citrine -d citrine -c \
  "SELECT \"transactionId\", \"isActive\", \"createdAt\" FROM \"Transactions\" \
   WHERE \"stationId\" = '250822008C06' ORDER BY \"createdAt\" DESC LIMIT 3;"
echo ""

echo -e "${YELLOW}Step 5: Testing Hasura GraphQL Connection...${NC}"
echo "---"
curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "x-hasura-admin-secret: CitrineOS!" \
  http://103.174.148.201:8090/v1/graphql \
  -d '{"query": "{ ChargingStations(where: {id: {_eq: \"250822008C06\"}}) { id isOnline protocol } }"}' | jq .
echo ""

echo -e "${YELLOW}Step 6: Recent MeterValues (Last 3)...${NC}"
echo "---"
docker exec csms-postgres psql -U citrine -d citrine -c \
  "SELECT \"transactionId\", 
          \"sampledValue\"->0->>'measurand' as measurand,
          \"sampledValue\"->0->>'value' as value,
          \"createdAt\" 
   FROM \"MeterValues\" 
   ORDER BY \"createdAt\" DESC LIMIT 3;"
echo ""

echo -e "${GREEN}======================================"
echo "Initial checks complete!"
echo "======================================${NC}"
echo ""
echo "Next steps:"
echo "1. To START charging, run:"
echo "   ./start_charging.sh"
echo ""
echo "2. To STOP charging, run:"
echo "   ./stop_charging.sh"
echo ""
echo "3. To view the full guide, check:"
echo "   /root/.gemini/antigravity/brain/3d42654b-6707-4ba4-b685-f8ea7b0b6db1/ui_testing_guide.md"
