#!/bin/bash

# Test script for rating enrichment workflow
# This script simulates what the GitHub Action will do

set -e  # Exit on any error

echo "🧪 Testing Rating Enrichment Workflow"
echo "====================================="

# Check if we're in the right directory
if [ ! -f "src/rating-enrichment.mjs" ]; then
    echo "❌ Error: rating-enrichment.mjs not found. Please run this script from the project root."
    exit 1
fi

echo "📦 Installing dependencies..."
npm install

echo "🔄 Running rating enrichment script..."
node src/rating-enrichment.mjs

echo "📁 Copying files to v2/public..."
cp www/junior-ratings.json v2/public/
cp www/open-ratings.json v2/public/

echo "🔍 Checking for changes..."
if git diff --quiet; then
    echo "ℹ️ No changes detected - ratings are already up to date"
else
    echo "✅ Changes detected! Files have been updated:"
    git diff --name-only
    echo ""
    echo "📊 Updated files:"
    echo "  - www/junior-ratings.json"
    echo "  - www/open-ratings.json"
    echo "  - v2/public/junior-ratings.json"
    echo "  - v2/public/open-ratings.json"
fi

echo ""
echo "🎉 Test completed successfully!"
