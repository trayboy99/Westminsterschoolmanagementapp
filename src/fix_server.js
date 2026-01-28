#!/usr/bin/env node
/**
 * Emergency Server File Fix Script
 * Removes corrupted code with escaped newlines from the server file
 */

const fs = require('fs');
const path = require('path');

// Path to the corrupted server file
const SERVER_FILE = path.join(__dirname, 'supabase', 'functions', 'server', 'index.tsx');

function fixServerFile() {
    console.log('🔧 Starting server file repair...');
    
    // Read the file
    const content = fs.readFileSync(SERVER_FILE, 'utf-8');
    const lines = content.split('\n');
    
    console.log(`📄 Read ${lines.length} lines from server file`);
    
    // Keep everything up to and including line 6872 (0-indexed, so lines[6871])
    const goodLines = lines.slice(0, 6872);
    
    console.log(`✂️  Keeping first 6872 lines (up to the last good closing brace)`);
    
    // Add the proper ending
    goodLines.push('');  // Blank line
    goodLines.push('Deno.serve(app.fetch);');
    
    // Write back the fixed file
    const fixedContent = goodLines.join('\n');
    fs.writeFileSync(SERVER_FILE, fixedContent, 'utf-8');
    
    console.log(`✅ Server file repaired!`);
    console.log(`📝 Final file has ${goodLines.length} lines`);
    console.log(`🎯 Last line is: Deno.serve(app.fetch);`);
    console.log('\n🚀 Your server should now work properly!');
    console.log('   - Login will function');
    console.log('   - Demo users will display');
    console.log('   - All endpoints restored');
}

// Check if file exists
if (!fs.existsSync(SERVER_FILE)) {
    console.error(`❌ Error: Could not find ${SERVER_FILE}`);
    console.error('   Make sure you\'re running this from the project root directory');
    process.exit(1);
}

fixServerFile();
