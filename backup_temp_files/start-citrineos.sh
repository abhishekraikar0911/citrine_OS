#!/bin/bash

echo "=========================================="
echo "CitrineOS CSMS Quick Start"
echo "=========================================="
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running. Please start Docker first."
    exit 1
fi

echo "✓ Docker is running"
echo ""

# Navigate to Server directory
cd /opt/csms/citrineos-core/Server

echo "Starting CitrineOS services..."
echo ""

# Start services
docker compose up -d

echo ""
echo "Waiting for services to be healthy..."
sleep 10

# Check service status
docker compose ps

echo ""
echo "=========================================="
echo "CitrineOS Services Started!"
echo "=========================================="
echo ""
echo "Access the following endpoints:"
echo ""
echo "📡 OCPP WebSocket (no auth):  ws://localhost:8081"
echo "🔐 OCPP WebSocket (with auth): ws://localhost:8082"
echo "📚 REST API & Swagger:         http://localhost:8080/docs"
echo "🐰 RabbitMQ Management:        http://localhost:15672 (guest/guest)"
echo "📊 Hasura GraphQL Console:     http://localhost:8090"
echo "💾 MinIO Console:              http://localhost:9001 (minioadmin/minioadmin)"
echo ""
echo "=========================================="
echo "Connect your charging station to:"
echo "ws://localhost:8081/YOUR_STATION_ID"
echo ""
echo "Example: ws://localhost:8081/cp001"
echo "=========================================="
echo ""
echo "To view logs: docker compose logs -f"
echo "To stop:      docker compose down"
echo ""
