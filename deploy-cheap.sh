#!/bin/bash

# CHEAP DEPLOYMENT SCRIPT FOR TNS
# Deploys to any VPS with Docker installed (DigitalOcean, Linode, Oracle Cloud Free Tier, etc)

set -e

echo "🚀 TNS Cheap Deployment Script"
echo "==============================="

# Check if required env vars are set
if [ -z "$DEPLOY_HOST" ]; then
    echo "❌ Please set DEPLOY_HOST (e.g., export DEPLOY_HOST=tns.acadia.sh)"
    exit 1
fi

if [ -z "$DEPLOY_USER" ]; then
    DEPLOY_USER="root"
    echo "ℹ️ Using default user: root"
fi

echo ""
echo "📦 Deployment Target:"
echo "  Host: $DEPLOY_HOST"
echo "  User: $DEPLOY_USER"
echo ""

# Step 1: Build and push Docker images
echo "🔨 Building Docker images..."
docker build -t tns-backend ./backend
docker build -t tns-frontend ./frontend

# Step 2: Save images
echo "💾 Saving Docker images..."
docker save tns-backend | gzip > tns-backend.tar.gz
docker save tns-frontend | gzip > tns-frontend.tar.gz

# Step 3: Upload to server
echo "📤 Uploading to server..."
scp docker-compose.yml $DEPLOY_USER@$DEPLOY_HOST:~/tns/
scp .env.production $DEPLOY_USER@$DEPLOY_HOST:~/tns/.env
scp tns-backend.tar.gz $DEPLOY_USER@$DEPLOY_HOST:~/tns/
scp tns-frontend.tar.gz $DEPLOY_USER@$DEPLOY_HOST:~/tns/

# Step 4: Deploy on server
echo "🚀 Deploying on server..."
ssh $DEPLOY_USER@$DEPLOY_HOST << 'ENDSSH'
cd ~/tns

# Load Docker images
echo "Loading Docker images..."
docker load < tns-backend.tar.gz
docker load < tns-frontend.tar.gz

# Stop existing containers
docker-compose down

# Start new containers
docker-compose up -d

# Clean up
rm tns-backend.tar.gz tns-frontend.tar.gz

echo "✅ Deployment complete!"
echo "🌐 Visit https://tns.acadia.sh"
ENDSSH

# Clean up local files
rm tns-backend.tar.gz tns-frontend.tar.gz

echo ""
echo "✨ Deployment successful!"
echo "🔒 Remember to:"
echo "  1. Set up SSL with Let's Encrypt"
echo "  2. Configure firewall (only ports 80, 443, 22)"
echo "  3. Set up regular backups"