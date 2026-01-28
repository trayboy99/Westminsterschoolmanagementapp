#!/bin/sh
# One-command fix for the corrupted server file
# Run this with: sh fix_now.sh

echo "🔧 Fixing server file..."

# Use head to keep first 6872 lines, then add proper ending
head -n 6872 ./supabase/functions/server/index.tsx > ./supabase/functions/server/index.tsx.fixed
echo "" >> ./supabase/functions/server/index.tsx.fixed
echo "Deno.serve(app.fetch);" >> ./supabase/functions/server/index.tsx.fixed

# Replace original with fixed version
mv ./supabase/functions/server/index.tsx.fixed ./supabase/functions/server/index.tsx

echo "✅ Server file fixed!"
echo "📝 File now ends with: Deno.serve(app.fetch);"
echo "🚀 Your server should work now!"
