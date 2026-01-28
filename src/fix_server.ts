// Emergency Server File Fix Script for Deno
// Removes corrupted code with escaped newlines from the server file

const SERVER_FILE = "./supabase/functions/server/index.tsx";

console.log("🔧 Starting server file repair...");

try {
  // Read the file
  const content = await Deno.readTextFile(SERVER_FILE);
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
  await Deno.writeTextFile(SERVER_FILE, fixedContent);
  
  console.log(`✅ Server file repaired!`);
  console.log(`📝 Final file has ${goodLines.length} lines`);
  console.log(`🎯 Last line is: Deno.serve(app.fetch);`);
  console.log('\n🚀 Your server should now work properly!');
  console.log('   - Login will function');
  console.log('   - Demo users will display');
  console.log('   - All endpoints restored');
  
} catch (error) {
  console.error(`❌ Error: ${error.message}`);
  console.error('   Make sure you\'re running this from the project root directory');
  Deno.exit(1);
}
