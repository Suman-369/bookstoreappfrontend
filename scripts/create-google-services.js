#!/usr/bin/env node

/**
 * EAS Build Hook: Creates google-services.json from EAS secret
 * This script reads the GOOGLE_SERVICES_JSON environment variable
 * and writes it to google-services.json file
 */

const fs = require('fs');
const path = require('path');

const GOOGLE_SERVICES_JSON = process.env.GOOGLE_SERVICES_JSON;
const OUTPUT_FILE = path.join(__dirname, '..', 'google-services.json');

if (!GOOGLE_SERVICES_JSON) {
  console.error('❌ Error: GOOGLE_SERVICES_JSON environment variable is not set');
  console.error('Please set it using: eas secret:create --scope project --name GOOGLE_SERVICES_JSON --value "$(cat google-services.json)"');
  process.exit(1);
}

try {
  // Parse to validate JSON
  const jsonContent = JSON.parse(GOOGLE_SERVICES_JSON);
  
  // Write to file
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(jsonContent, null, 2), 'utf8');
  
  console.log('✅ Successfully created google-services.json from EAS secret');
  console.log(`📄 File written to: ${OUTPUT_FILE}`);
} catch (error) {
  console.error('❌ Error creating google-services.json:');
  console.error(error.message);
  process.exit(1);
}
