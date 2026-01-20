#!/bin/bash

# NutriVault Docker Quick Start Script

set -e

echo "========================================"
echo "NutriVault Docker Deployment"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed${NC}"
    echo "Install Docker from: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${RED}Error: Docker Compose is not installed${NC}"
    echo "Install Docker Compose from: https://docs.docker.com/compose/install/"
    exit 1
fi

echo -e "${GREEN}✓ Docker and Docker Compose are installed${NC}"
echo ""

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Creating .env file from template...${NC}"

    if [ -f ".env.docker" ]; then
        cp .env.docker .env
    elif [ -f ".env.example" ]; then
        cp .env.example .env
    else
        echo -e "${RED}Error: No environment template found${NC}"
        exit 1
    fi

    echo ""
    echo -e "${YELLOW}IMPORTANT: You need to update the .env file with secure secrets!${NC}"
    echo ""
    echo "Generate secrets with:"
    echo "  openssl rand -base64 48"
    echo ""
    echo "Edit .env file and update JWT_SECRET and REFRESH_TOKEN_SECRET"
    echo ""
    read -p "Press Enter after updating .env file, or Ctrl+C to cancel..."
fi

echo -e "${GREEN}✓ Environment file exists${NC}"
echo ""

# Build Docker image
echo "Building Docker image..."
docker-compose build

echo -e "${GREEN}✓ Docker image built${NC}"
echo ""

# Start containers
echo "Starting containers..."
docker-compose up -d

echo -e "${GREEN}✓ Containers started${NC}"
echo ""

# Wait for container to be healthy
echo "Waiting for application to be ready..."
sleep 5

# Check if migrations need to be run
echo "Setting up database..."
docker-compose exec nutrivault npm run db:migrate
docker-compose exec nutrivault npm run db:seed

echo -e "${GREEN}✓ Database initialized${NC}"
echo ""

# Show status
echo "========================================"
echo -e "${GREEN}Deployment Complete!${NC}"
echo "========================================"
echo ""
echo "Application is running:"
echo "  🌐 URL: http://localhost:3001"
echo "  🔍 Health: http://localhost:3001/health"
echo ""
echo "Default credentials:"
echo "  Username: admin"
echo "  Password: Admin123!"
echo ""
echo "Useful commands:"
echo "  docker-compose ps              - View running containers"
echo "  docker-compose logs -f         - View logs"
echo "  docker-compose stop            - Stop containers"
echo "  docker-compose restart         - Restart containers"
echo "  docker-compose down            - Stop and remove containers"
echo ""
