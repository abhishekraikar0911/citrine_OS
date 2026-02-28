#!/bin/bash

echo "=========================================="
echo "CitrineOS Complete Stack Startup"
echo "=========================================="
echo ""

# Check Docker
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running"
    exit 1
fi

echo "Starting CitrineOS components..."
echo ""

# 1. Core CSMS
echo "1️⃣  Starting Core CSMS..."
cd /opt/csms/citrineos-core/Server
docker compose up -d
echo "✓ Core CSMS started"
echo ""

# 2. Operator UI
echo "2️⃣  Starting Operator UI..."
cd /opt/csms/citrineos-operator-ui
docker compose up -d
echo "✓ Operator UI started"
echo ""

# 3. OCPI (optional)
read -p "Start OCPI service? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "3️⃣  Starting OCPI..."
    cd /opt/csms/citrineos-ocpi/Server
    docker compose up -d
    echo "✓ OCPI started"
fi
echo ""

sleep 5

echo "=========================================="
echo "✅ CitrineOS Stack Running!"
echo "=========================================="
echo ""
echo "🌐 Service Endpoints:"
echo ""
echo "Core CSMS:"
echo "  • OCPP WebSocket:    ws://localhost:8081"
echo "  • REST API/Swagger:  http://localhost:8080/docs"
echo "  • RabbitMQ:          http://localhost:15672"
echo "  • Hasura GraphQL:    http://localhost:8090"
echo ""
echo "Operator UI:"
echo "  • Web Interface:     http://localhost:3000"
echo ""
echo "=========================================="
echo ""
echo "📋 Useful Commands:"
echo "  View logs:    docker compose logs -f"
echo "  Stop all:     docker compose down"
echo "  Restart:      docker compose restart"
echo ""
