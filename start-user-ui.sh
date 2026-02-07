#!/bin/bash

# CitrineoS User UI - Deployment Script
# This script sets up and starts the User UI for EV drivers

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║        CitrineoS User UI - Deployment Script                  ║"
echo "╚════════════════════════════════════════════════════════════════╝"

cd /opt/csms/citrineos-user-ui

echo ""
echo "📋 Checking environment configuration..."
if [ -f ".env.local" ]; then
    echo "✅ .env.local found"
    cat .env.local
else
    echo "❌ .env.local not found. Creating from defaults..."
    cat > .env.local << 'EOF'
NEXT_PUBLIC_HASURA_URL=http://103.174.148.201:8090/v1/graphql
NEXT_PUBLIC_HASURA_ADMIN_SECRET=CitrineOS!
NEXT_PUBLIC_CITRINEOS_API_URL=http://103.174.148.201:8081
PORT=3001
EOF
    echo "✅ Created .env.local"
fi

echo ""
echo "📦 Checking Node.js installation..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "✅ Node.js $NODE_VERSION installed"
else
    echo "❌ Node.js not found. Please install Node.js 18+"
    exit 1
fi

echo ""
echo "📚 Checking dependencies..."
if [ ! -d "node_modules" ]; then
    echo "⚙️  Installing dependencies..."
    npm install
    echo "✅ Dependencies installed"
else
    echo "✅ Dependencies already installed"
fi

echo ""
echo "🔨 Building Next.js application..."
if [ -d ".next" ]; then
    echo "✅ Already built. Skipping build."
else
    npm run build
    echo "✅ Build complete"
fi

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                     DEPLOYMENT OPTIONS                         ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "Choose how to start the User UI:"
echo ""
echo "1) Development Mode (auto-reload, slower)"
echo "   $ npm run dev"
echo ""
echo "2) Production Mode (optimized, recommended)"
echo "   $ npm start"
echo ""
echo "3) Docker (containerized, isolated)"
echo "   $ docker-compose -f docker-compose-user-ui.yml up -d"
echo ""
echo "Starting in Production Mode..."
echo ""

npm start
