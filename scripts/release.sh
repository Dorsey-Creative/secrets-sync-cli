#!/bin/bash
set -e

# Check if on main branch
BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$BRANCH" != "main" ]; then
  echo "❌ Error: Must be on main branch to release"
  exit 1
fi

# Check if working directory is clean
if [ -n "$(git status --porcelain)" ]; then
  echo "❌ Error: Working directory is not clean"
  exit 1
fi

# Get version type
VERSION_TYPE=${1:-patch}

if [[ ! "$VERSION_TYPE" =~ ^(patch|minor|major)$ ]]; then
  echo "❌ Error: Invalid version type. Use: patch, minor, or major"
  exit 1
fi

echo "🚀 Preparing $VERSION_TYPE release..."

# Pull latest
git pull origin main

# Run tests
echo "🧪 Running tests..."
bun test

# Bump version
echo "📦 Bumping version..."
npm version $VERSION_TYPE -m "chore: release v%s [skip ci]"

# Push changes and tags
echo "⬆️  Pushing to GitHub..."
git push origin main --follow-tags

echo "✅ Release prepared! GitHub Actions will publish to npm."
