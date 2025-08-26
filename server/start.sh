#!/bin/bash

# Start script with auto-restart capability
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "Starting Singularity Server with auto-restart..."

while true; do
    echo "$(date): Starting server..."
    
    # Start the server with increased memory and enable gc
    LOG_LEVEL=warn node --max-old-space-size=1024 --expose-gc index.ts
    
    exit_code=$?
    echo "$(date): Server exited with code $exit_code"
    
    if [ $exit_code -eq 0 ]; then
        echo "$(date): Clean exit, stopping restart loop"
        break
    else
        echo "$(date): Server crashed, restarting in 5 seconds..."
        sleep 5
    fi
done
