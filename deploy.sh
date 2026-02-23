#!/bin/bash

# Deployment script for Signal Viewer

echo "========================================="
echo "  Signal Viewer - Deployment Script"
echo "========================================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Docker not found. Please install Docker first."
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "docker-compose not found. Using 'docker compose' instead."
    DOCKER_COMPOSE="docker compose"
else
    DOCKER_COMPOSE="docker-compose"
fi

echo "Building and starting containers..."
$DOCKER_COMPOSE up --build -d

echo ""
echo "========================================="
echo "  Services Started!"
echo "========================================="
echo "Backend API: http://localhost:5000"
echo "Frontend:   http://localhost:3000"
echo ""
echo "To stop: $DOCKER_COMPOSE down"
