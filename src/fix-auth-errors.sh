#!/bin/bash

# ================================================================
# CRITICAL AUTH FIX: Replace all supabase.auth.getUser(accessToken)
# with verifyUserAuth(accessToken) in server index.tsx
# ================================================================

set -e  # Exit on error

FILE="supabase/functions/server/index.tsx"

echo "🔍 Auth Error Fix Script"
echo "========================"
echo ""

# Check if file exists
if [ ! -f "$FILE" ]; then
  echo "❌ ERROR: File not found: $FILE"
  echo "   Make sure you're running this script from the project root directory"
  exit 1
fi

# Create backup
BACKUP="${FILE}.backup-$(date +%Y%m%d-%H%M%S)"
echo "📦 Creating backup: $BACKUP"
cp "$FILE" "$BACKUP"
echo "   ✅ Backup created successfully"
echo ""

# Count current instances before fix
BEFORE_COUNT=$(grep -c "await supabase\.auth\.getUser(accessToken)" "$FILE" || true)
echo "🔍 Found $BEFORE_COUNT instances of the old auth pattern"
echo ""

if [ "$BEFORE_COUNT" -eq 0 ]; then
  echo "✅ No instances found - file is already fixed!"
  echo "   Removing backup..."
  rm "$BACKUP"
  exit 0
fi

# Perform the replacement
echo "🔧 Performing replacement..."
echo "   Find:    await supabase.auth.getUser(accessToken)"
echo "   Replace: await verifyUserAuth(accessToken)"
echo ""

# Use sed to replace all instances
# macOS and Linux have different sed syntax, so we handle both
if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS
  sed -i '' 's/await supabase\.auth\.getUser(accessToken)/await verifyUserAuth(accessToken)/g' "$FILE"
else
  # Linux
  sed -i 's/await supabase\.auth\.getUser(accessToken)/await verifyUserAuth(accessToken)/g' "$FILE"
fi

# Count instances after fix
AFTER_COUNT=$(grep -c "await supabase\.auth\.getUser(accessToken)" "$FILE" || true)
VERIFY_COUNT=$(grep -c "await verifyUserAuth(accessToken)" "$FILE" || true)

echo "✅ Replacement complete!"
echo ""
echo "📊 Results:"
echo "   Before:  $BEFORE_COUNT instances of supabase.auth.getUser(accessToken)"
echo "   After:   $AFTER_COUNT instances remaining (should be 0)"
echo "   New:     $VERIFY_COUNT instances of verifyUserAuth(accessToken)"
echo ""

if [ "$AFTER_COUNT" -eq 0 ]; then
  echo "✅ SUCCESS! All instances have been replaced."
  echo ""
  echo "📝 Next steps:"
  echo "   1. Review the changes in $FILE"
  echo "   2. Test the application to ensure auth works"
  echo "   3. Deploy the updated server code"
  echo "   4. Monitor for '401 Unauthorized' errors (should be gone)"
  echo ""
  echo "   If everything works, you can delete the backup:"
  echo "   rm $BACKUP"
else
  echo "⚠️  WARNING: $AFTER_COUNT instances still remain!"
  echo "   This might indicate a different pattern. Manual review needed."
  echo ""
  echo "   To restore the backup:"
  echo "   cp $BACKUP $FILE"
fi

echo ""
echo "🎉 Done!"
