#!/bin/bash
#
# NutriVault Release Script
# Creates a new release: bumps version, commits, tags, and deploys
#
# Usage:
#   ./scripts/release.sh patch     # 5.1.0 -> 5.1.1
#   ./scripts/release.sh minor     # 5.1.0 -> 5.2.0
#   ./scripts/release.sh major     # 5.1.0 -> 6.0.0
#   ./scripts/release.sh 5.3.0     # Set specific version
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Get current version
get_current_version() {
    node -p "require('${PROJECT_DIR}/backend/package.json').version"
}

# Bump version
bump_version() {
    local current=$1
    local type=$2

    IFS='.' read -r major minor patch <<< "$current"

    case $type in
        major)
            echo "$((major + 1)).0.0"
            ;;
        minor)
            echo "${major}.$((minor + 1)).0"
            ;;
        patch)
            echo "${major}.${minor}.$((patch + 1))"
            ;;
        *)
            # Assume it's a specific version
            echo "$type"
            ;;
    esac
}

# Update version in package.json files
update_package_versions() {
    local version=$1

    log_info "Updating package.json files to version ${version}"

    # Update backend/package.json
    cd "${PROJECT_DIR}/backend"
    npm version "${version}" --no-git-tag-version --allow-same-version

    # Update frontend/package.json
    cd "${PROJECT_DIR}/frontend"
    npm version "${version}" --no-git-tag-version --allow-same-version

    cd "${PROJECT_DIR}"
}

# Create git commit and tag
create_git_release() {
    local version=$1

    log_info "Creating git release for v${version}"

    cd "${PROJECT_DIR}"

    # Check for uncommitted changes (other than package.json)
    if ! git diff --quiet --exit-code -- ':!backend/package.json' ':!frontend/package.json' ':!backend/package-lock.json' ':!frontend/package-lock.json'; then
        log_warn "You have uncommitted changes. Please commit or stash them first."
        git status --short
        read -p "Continue anyway? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi

    # Stage version changes
    git add backend/package.json backend/package-lock.json frontend/package.json frontend/package-lock.json 2>/dev/null || true

    # Commit
    git commit -m "chore: release v${version}" || log_warn "Nothing to commit"

    # Create tag
    git tag -a "v${version}" -m "Release v${version}"

    log_success "Created tag v${version}"
}

# Show help
show_help() {
    echo "NutriVault Release Script"
    echo ""
    echo "Usage:"
    echo "  $0 patch              Bump patch version (5.1.0 -> 5.1.1)"
    echo "  $0 minor              Bump minor version (5.1.0 -> 5.2.0)"
    echo "  $0 major              Bump major version (5.1.0 -> 6.0.0)"
    echo "  $0 <version>          Set specific version (e.g., 5.3.0)"
    echo ""
    echo "Options:"
    echo "  --no-deploy           Skip deployment after release"
    echo "  --no-tag              Skip git tag creation"
    echo "  --push                Push to remote after release"
    echo "  --help                Show this help"
    echo ""
    echo "Examples:"
    echo "  $0 patch              Create patch release and deploy"
    echo "  $0 minor --push       Create minor release, deploy, and push to remote"
    echo "  $0 5.3.0 --no-deploy  Set version 5.3.0 without deploying"
    echo ""
}

# Main
main() {
    local bump_type=""
    local do_deploy=true
    local do_tag=true
    local do_push=false

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --help|-h)
                show_help
                exit 0
                ;;
            --no-deploy)
                do_deploy=false
                shift
                ;;
            --no-tag)
                do_tag=false
                shift
                ;;
            --push)
                do_push=true
                shift
                ;;
            *)
                bump_type=$1
                shift
                ;;
        esac
    done

    if [ -z "$bump_type" ]; then
        log_error "Please specify version bump type: patch, minor, major, or a specific version"
        echo ""
        show_help
        exit 1
    fi

    # Calculate new version
    local current_version=$(get_current_version)
    local new_version=$(bump_version "$current_version" "$bump_type")

    log_info "=========================================="
    log_info "NutriVault Release"
    log_info "=========================================="
    log_info "Current version: ${current_version}"
    log_info "New version:     ${new_version}"
    log_info "=========================================="

    # Confirm
    read -p "Proceed with release? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_warn "Release cancelled"
        exit 0
    fi

    # Update versions
    update_package_versions "$new_version"

    # Create git release
    if [ "$do_tag" = true ]; then
        create_git_release "$new_version"
    fi

    # Push to remote
    if [ "$do_push" = true ]; then
        log_info "Pushing to remote..."
        git push origin HEAD
        git push origin "v${new_version}"
        log_success "Pushed to remote"
    fi

    # Deploy
    if [ "$do_deploy" = true ]; then
        log_info "Starting deployment..."
        "${SCRIPT_DIR}/deploy.sh" "$new_version"
    else
        log_info "Skipping deployment (use ./scripts/deploy.sh to deploy later)"
    fi

    log_info "=========================================="
    log_success "Release v${new_version} complete!"
    log_info "=========================================="

    if [ "$do_push" = false ]; then
        log_info "Don't forget to push:"
        log_info "  git push origin HEAD"
        log_info "  git push origin v${new_version}"
    fi
}

main "$@"
