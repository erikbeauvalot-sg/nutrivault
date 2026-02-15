#!/bin/bash
# bump-version.sh — Increment version across package.json (root + frontend) and Xcode project
#
# Usage:
#   ./scripts/bump-version.sh patch   # 8.7.2 → 8.7.3, build = 8.7.3-YYYYMMDD
#   ./scripts/bump-version.sh minor   # 8.7.2 → 8.8.0, build = 8.8.0-YYYYMMDD
#   ./scripts/bump-version.sh major   # 8.7.2 → 9.0.0, build = 9.0.0-YYYYMMDD
#   ./scripts/bump-version.sh build   # version unchanged, build = version-YYYYMMDD
#
# Build number format: VERSION-YYYYMMDD (e.g. 8.7.10-20260215)
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

# Today's date
DATE_STAMP=$(date +%Y%m%d)

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
    # Version stays the same, only build date updates
    ;;
  *)
    echo "Usage: $0 {major|minor|patch|build}"
    exit 1
    ;;
esac

NEW_VERSION="$MAJOR.$MINOR.$PATCH"
NEW_BUILD="$NEW_VERSION-$DATE_STAMP"

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
