#!/bin/bash
# Bump to next release version (removes build suffix)
# Usage: ./scripts/bump-release.sh [major|minor|patch]

set -e

BUMP_TYPE=${1:-patch}

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")

# Remove build suffix if present
BASE_VERSION=$(echo "$CURRENT_VERSION" | sed 's/-[0-9]*$//')

# Bump version
npm version "$BUMP_TYPE" --no-git-tag-version

NEW_VERSION=$(node -p "require('./package.json').version")

echo "Release version: $CURRENT_VERSION → $NEW_VERSION"
echo "Next develop will be: ${NEW_VERSION}-1"
