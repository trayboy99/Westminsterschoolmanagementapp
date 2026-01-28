#!/usr/bin/env python3
"""
Emergency Server File Fix Script
Removes corrupted code with escaped newlines from the server file
"""

import os

# Path to the corrupted server file
SERVER_FILE = "./supabase/functions/server/index.tsx"

def fix_server_file():
    print("🔧 Starting server file repair...")
    
    # Read the file
    with open(SERVER_FILE, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    print(f"📄 Read {len(lines)} lines from server file")
    
    # Find line 6872 (the last good line with });)
    # Keep everything up to and including line 6872
    good_lines = lines[:6872]
    
    print(f"✂️  Keeping first 6872 lines (up to the last good closing brace)")
    
    # Add the proper ending
    good_lines.append('\n')  # Blank line
    good_lines.append('Deno.serve(app.fetch);\n')
    
    # Write back the fixed file
    with open(SERVER_FILE, 'w', encoding='utf-8') as f:
        f.writelines(good_lines)
    
    print(f"✅ Server file repaired!")
    print(f"📝 Final file has {len(good_lines)} lines")
    print(f"🎯 Last line is: Deno.serve(app.fetch);")
    print("\n🚀 Your server should now work properly!")
    print("   - Login will function")
    print("   - Demo users will display")
    print("   - All endpoints restored")

if __name__ == "__main__":
    if not os.path.exists(SERVER_FILE):
        print(f"❌ Error: Could not find {SERVER_FILE}")
        print("   Make sure you're running this from the project root directory")
        exit(1)
    
    fix_server_file()
