#!/bin/bash
# Bump build number for develop branch
# Usage: ./scripts/bump-build.sh

set -e

# Get current version from package.json
CURRENT_VERSION=$(node -p "require('./package.json').version")

# Extract base version (e.g., 1.0.0 from 1.0.0-18)
BASE_VERSION=$(echo "$CURRENT_VERSION" | sed 's/-[0-9]*$//')

# Extract build number or default to 0
if [[ $CURRENT_VERSION =~ -([0-9]+)$ ]]; then
  BUILD_NUM=${BASH_REMATCH[1]}
else
  BUILD_NUM=0
fi

# Increment build number
NEW_BUILD_NUM=$((BUILD_NUM + 1))
NEW_VERSION="${BASE_VERSION}-${NEW_BUILD_NUM}"

# Update package.json
npm version "$NEW_VERSION" --no-git-tag-version

echo "Version bumped: $CURRENT_VERSION → $NEW_VERSION"
