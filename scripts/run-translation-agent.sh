#!/bin/bash

# Frontend Translation Agent Runner
# This script runs the translation agent to maintain i18n translations
# Usage: ./run-translation-agent.sh [file1] [file2] ...
# If no files specified, it will check for recently modified frontend files

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$SCRIPT_DIR/frontend"
LOCALES_DIR="$FRONTEND_DIR/src/locales"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}🌐 Frontend Translation Agent${NC}"
echo "=================================="

# Function to check if a file contains user-facing strings
check_file_for_strings() {
    local file="$1"
    local has_strings=false

    # Check for common patterns that indicate user-facing strings
    if grep -q ">[A-Z][a-zA-Z ]*<" "$file" 2>/dev/null; then
        has_strings=true
    fi

    if grep -q "placeholder=" "$file" 2>/dev/null; then
        has_strings=true
    fi

    if grep -q "aria-label=" "$file" 2>/dev/null; then
        has_strings=true
    fi

    if grep -q "alt=" "$file" 2>/dev/null; then
        has_strings=true
    fi

    echo "$has_strings"
}

# Function to extract strings from a file
extract_strings() {
    local file="$1"
    echo "Extracting strings from: $file"

    # This is a simplified extraction - in practice, the agent would do more sophisticated parsing
    # For now, we'll just identify files that need attention
    if [ "$(check_file_for_strings "$file")" = "true" ]; then
        echo -e "${YELLOW}⚠️  File contains user-facing strings that may need translation${NC}"
        echo "   Consider running the translation agent on this file"
        return 0
    else
        echo -e "${GREEN}✅ File appears to use translation keys properly${NC}"
        return 0
    fi
}

# Function to validate translation files
validate_translations() {
    echo "Validating translation files..."

    # Check if JSON files are valid
    if ! jq empty "$LOCALES_DIR/en.json" 2>/dev/null; then
        echo -e "${RED}❌ English translation file has invalid JSON${NC}"
        return 1
    fi

    if ! jq empty "$LOCALES_DIR/fr.json" 2>/dev/null; then
        echo -e "${RED}❌ French translation file has invalid JSON${NC}"
        return 1
    fi

    echo -e "${GREEN}✅ Translation files have valid JSON${NC}"
    return 0
}

# Main execution
main() {
    # Validate existing translation files
    if ! validate_translations; then
        exit 1
    fi

    # If specific files are provided, check them
    if [ $# -gt 0 ]; then
        echo "Checking specified files..."
        for file in "$@"; do
            if [ -f "$file" ]; then
                extract_strings "$file"
            else
                echo -e "${RED}❌ File not found: $file${NC}"
            fi
        done
    else
        # Check for recently modified frontend files
        echo "Checking for recently modified frontend files..."
        if command -v git >/dev/null 2>&1 && [ -d ".git" ]; then
            # Get files modified in the last commit or working directory changes
            modified_files=$(git status --porcelain | grep "^[AM]" | grep "frontend/src" | awk '{print $2}' || true)

            if [ -n "$modified_files" ]; then
                echo "Found modified frontend files:"
                echo "$modified_files" | while read -r file; do
                    if [ -f "$file" ] && [[ "$file" =~ \.(jsx|tsx|js|ts)$ ]]; then
                        extract_strings "$file"
                    fi
                done
            else
                echo -e "${GREEN}✅ No recently modified frontend files found${NC}"
            fi
        else
            echo -e "${YELLOW}⚠️  Git not available or not a git repository${NC}"
        fi
    fi

    echo ""
    echo -e "${YELLOW}📝 To run the full translation agent:${NC}"
    echo "   Use the prompt: .github/prompts/frontend-translation-agent.prompt.md"
    echo ""
    echo -e "${GREEN}🎉 Translation check complete${NC}"
}

# Run main function
main "$@"