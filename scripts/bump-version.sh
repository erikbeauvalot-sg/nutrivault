#!/bin/bash
# bump-version.sh — Increment version across package.json (root + frontend) and Xcode project
#
# Usage:
#   ./scripts/bump-version.sh patch   # 8.7.2 → 8.7.3, build++
#   ./scripts/bump-version.sh minor   # 8.7.2 → 8.8.0, build++
#   ./scripts/bump-version.sh major   # 8.7.2 → 9.0.0, build++
#   ./scripts/bump-version.sh build   # version unchanged, build++ only
#
# Syncs: root package.json, frontend/package.json, Xcode MARKETING_VERSION + CURRENT_PROJECT_VERSION

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

BUMP_TYPE="${1:-patch}"
PBXPROJ="$ROOT_DIR/frontend/ios/App/App.xcodeproj/project.pbxproj"
ROOT_PKG="$ROOT_DIR/package.json"
FRONTEND_PKG="$ROOT_DIR/frontend/package.json"

# Read current version from root package.json
CURRENT_VERSION=$(node -p "require('$ROOT_PKG').version")
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"

# Read current build number from Xcode project
CURRENT_BUILD=$(grep -m1 'CURRENT_PROJECT_VERSION' "$PBXPROJ" | sed 's/[^0-9]//g')
NEW_BUILD=$((CURRENT_BUILD + 1))

case "$BUMP_TYPE" in
  major)
    MAJOR=$((MAJOR + 1))
    MINOR=0
    PATCH=0
    ;;
  minor)
    MINOR=$((MINOR + 1))
    PATCH=0
    ;;
  patch)
    PATCH=$((PATCH + 1))
    ;;
  build)
    # Version stays the same, only build number increments
    ;;
  *)
    echo "Usage: $0 {major|minor|patch|build}"
    exit 1
    ;;
esac

NEW_VERSION="$MAJOR.$MINOR.$PATCH"

# Update root package.json
node -e "
  const fs = require('fs');
  const pkg = JSON.parse(fs.readFileSync('$ROOT_PKG', 'utf8'));
  pkg.version = '$NEW_VERSION';
  fs.writeFileSync('$ROOT_PKG', JSON.stringify(pkg, null, 2) + '\n');
"

# Update frontend/package.json
node -e "
  const fs = require('fs');
  const pkg = JSON.parse(fs.readFileSync('$FRONTEND_PKG', 'utf8'));
  pkg.version = '$NEW_VERSION';
  fs.writeFileSync('$FRONTEND_PKG', JSON.stringify(pkg, null, 2) + '\n');
"

# Update Xcode project — MARKETING_VERSION and CURRENT_PROJECT_VERSION (both Debug and Release)
if [ -f "$PBXPROJ" ]; then
  sed -i '' "s/MARKETING_VERSION = [^;]*/MARKETING_VERSION = $NEW_VERSION/g" "$PBXPROJ"
  sed -i '' "s/CURRENT_PROJECT_VERSION = [^;]*/CURRENT_PROJECT_VERSION = $NEW_BUILD/g" "$PBXPROJ"
fi

echo "v$NEW_VERSION (build $NEW_BUILD)"
