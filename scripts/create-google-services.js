#!/usr/bin/env node

/**
 * EAS Build Hook: Creates google-services.json from EAS secret
 * This script reads the GOOGLE_SERVICES_JSON environment variable
 * and writes it to google-services.json file
 * 
 * Usage: node scripts/create-google-services.js [--platform android|ios]
 * The --platform argument is accepted but ignored (google-services.json is Android-specific)
 */

const fs = require('fs');
const path = require('path');

// Parse command line arguments (ignore --platform and other flags)
const args = process.argv.slice(2);
const platform = args.find(arg => arg.startsWith('--platform'))?.split('=')[1] || 
                 (args.includes('--platform') && args[args.indexOf('--platform') + 1]) || 
                 null;

// Only process for Android builds (google-services.json is Android-specific)
// For iOS, we would need GoogleService-Info.plist, but that's handled separately
if (platform && platform !== 'android') {
  console.log(`ℹ️  Skipping google-services.json creation for platform: ${platform}`);
  console.log('   (google-services.json is only needed for Android builds)');
  process.exit(0);
}

const GOOGLE_SERVICES_JSON = process.env.GOOGLE_SERVICES_JSON;
const OUTPUT_FILE = path.join(__dirname, '..', 'google-services.json');

if (!GOOGLE_SERVICES_JSON) {
  console.error('❌ Error: GOOGLE_SERVICES_JSON environment variable is not set');
  console.error('Please set it using: eas secret:create --scope project --name GOOGLE_SERVICES_JSON --value "$(cat google-services.json)"');
  console.error('');
  console.error('On Windows (PowerShell):');
  console.error('  $content = Get-Content google-services.json -Raw');
  console.error('  eas secret:create --scope project --name GOOGLE_SERVICES_JSON --value $content');
  process.exit(1);
}

try {
  // Parse to validate JSON
  const jsonContent = JSON.parse(GOOGLE_SERVICES_JSON);
  
  // Ensure the directory exists
  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Write to file
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(jsonContent, null, 2), 'utf8');
  
  console.log('✅ Successfully created google-services.json from EAS secret');
  console.log(`📄 File written to: ${OUTPUT_FILE}`);
} catch (error) {
  console.error('❌ Error creating google-services.json:');
  console.error(error.message);
  if (error instanceof SyntaxError) {
    console.error('   The GOOGLE_SERVICES_JSON secret appears to contain invalid JSON.');
    console.error('   Please verify the secret was created correctly.');
  }
  process.exit(1);
}
