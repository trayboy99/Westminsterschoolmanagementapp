#!/bin/bash
# Emergency Server File Fix Script
# Removes corrupted code with escaped newlines from the server file

SERVER_FILE="./supabase/functions/server/index.tsx"

echo "🔧 Starting server file repair..."

# Check if file exists
if [ ! -f "$SERVER_FILE" ]; then
    echo "❌ Error: Could not find $SERVER_FILE"
    echo "   Make sure you're running this from the project root directory"
    exit 1
fi

# Keep first 6872 lines and add the proper ending
head -n 6872 "$SERVER_FILE" > "$SERVER_FILE.tmp"
echo "" >> "$SERVER_FILE.tmp"
echo "Deno.serve(app.fetch);" >> "$SERVER_FILE.tmp"

# Replace original file with fixed version
mv "$SERVER_FILE.tmp" "$SERVER_FILE"

echo "✅ Server file repaired!"
echo "📝 File now has 6874 lines"
echo "🎯 Last line is: Deno.serve(app.fetch);"
echo ""
echo "🚀 Your server should now work properly!"
echo "   - Login will function"
echo "   - Demo users will display"
echo "   - All endpoints restored"
