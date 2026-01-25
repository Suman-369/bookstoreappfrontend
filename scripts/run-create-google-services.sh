#!/bin/bash
# Wrapper script to run create-google-services.js
# This ensures the script runs directly with node, not through expo

set -e  # Exit on error

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Filter out any --platform or other flags that might be passed incorrectly
# The script will get platform from environment variables anyway
FILTERED_ARGS=()
SKIP_NEXT=false
for arg in "$@"; do
  if [ "$SKIP_NEXT" = true ]; then
    SKIP_NEXT=false
    continue
  fi
  # Skip --platform flag and its value if present
  if [[ "$arg" == "--platform" ]]; then
    SKIP_NEXT=true  # Skip the next argument (the platform value)
    continue
  elif [[ "$arg" == --platform=* ]]; then
    continue  # Skip the flag with value
  else
    FILTERED_ARGS+=("$arg")
  fi
done

# Run the Node script directly
exec node "$SCRIPT_DIR/create-google-services.js" "${FILTERED_ARGS[@]}"
