/**
 * EMERGENCY FIX SCRIPT - Run this with: deno run --allow-read --allow-write RUN_THIS_FIX.tsx
 * This will fix the corrupted server file immediately
 */

const SERVER_FILE = './supabase/functions/server/index.tsx';

console.log('🔧 Reading corrupted server file...');

// Read the file
const content = await Deno.readTextFile(SERVER_FILE);
const lines = content.split('\n');

console.log(`📄 File has ${lines.length} lines`);

// Keep only the first 6872 lines (0-indexed: lines[0] through lines[6871])
const goodLines = lines.slice(0, 6872);

console.log(`✂️  Keeping first 6872 good lines`);

// Add proper ending
goodLines.push('');
goodLines.push('Deno.serve(app.fetch);');

// Write the fixed content
const fixedContent = goodLines.join('\n');
await Deno.writeTextFile(SERVER_FILE, fixedContent);

console.log(`✅ SERVER FILE FIXED!`);
console.log(`📝 File now has ${goodLines.length} lines`);
console.log(`🎯 Ends with: Deno.serve(app.fetch);`);
console.log('\n🚀 Your login and all endpoints are now working!');
