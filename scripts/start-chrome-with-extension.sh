#!/bin/bash

# Kill any existing Chrome instances
pkill -f "Google Chrome" 2>/dev/null || true
sleep 2

# Start Chrome with the extension loaded
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --load-extension="$(pwd)/chrome-extension" \
  --disable-extensions-except="$(pwd)/chrome-extension" \
  --user-data-dir="$(pwd)/chrome-profile" \
  --enable-extensions \
  --enable-logging \
  --log-level=0 \
  --new-window "chrome://extensions/" &

echo "Chrome started with extension. Please:"
echo "1. Enable 'Developer mode' (toggle in top right)"
echo "2. Find 'BrowserTools MCP' extension"
echo "3. Enable it (toggle the switch)"
echo "4. Navigate to http://localhost:3000/admin/tutorial-center"
echo "5. Open DevTools (F12) and look for 'BrowserToolsMCP' tab"




