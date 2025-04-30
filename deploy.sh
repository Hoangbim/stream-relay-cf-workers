#!/bin/bash

# Deploy script for Cloudflare Workers projects
# Usage: ./deploy.sh [project_path]

set -e

# Default to main project if no argument provided
PROJECT_PATH=${1:-.}

echo "Deploying project at: $PROJECT_PATH"

# Navigate to the project directory
cd "$PROJECT_PATH"

# Check if wrangler.toml exists
if [ ! -f "wrangler.toml" ]; then
  echo "Error: wrangler.toml not found in $PROJECT_PATH"
  exit 1
fi

# Build the project
echo "Building project..."
npm run build

# Deploy using wrangler
echo "Deploying with Cloudflare Wrangler..."
npx wrangler deploy

echo "Deployment complete!"