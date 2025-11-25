#!/bin/bash
# Bump build number for develop branch
# Usage: ./scripts/bump-build.sh

set -e

# Get current version from package.json
CURRENT_VERSION=$(node -p "require('./package.json').version")

# Extract base version (e.g., 1.0.0 from 1.0.0-20251124.1)
BASE_VERSION=$(echo "$CURRENT_VERSION" | sed 's/-[0-9]*\.[0-9]*$//')

# Get today's date in YYYYMMDD format
TODAY=$(date +%Y%m%d)

# Extract date and build number from current version if it exists
if [[ $CURRENT_VERSION =~ -([0-9]{8})\.([0-9]+)$ ]]; then
  CURRENT_DATE=${BASH_REMATCH[1]}
  BUILD_NUM=${BASH_REMATCH[2]}
  
  # If same day, increment build number, otherwise reset to 1
  if [ "$CURRENT_DATE" = "$TODAY" ]; then
    NEW_BUILD_NUM=$((BUILD_NUM + 1))
  else
    NEW_BUILD_NUM=1
  fi
else
  # No date-based version yet, start at 1
  NEW_BUILD_NUM=1
fi

NEW_VERSION="${BASE_VERSION}-${TODAY}.${NEW_BUILD_NUM}"

# Update package.json
npm version "$NEW_VERSION" --no-git-tag-version

echo "Version bumped: $CURRENT_VERSION → $NEW_VERSION"
