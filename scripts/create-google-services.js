import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envValue = process.env.GOOGLE_SERVICES_JSON;

if (!envValue) {
  console.log("GOOGLE_SERVICES_JSON not found");
  process.exit(0);
}

let json;
try {
  // Try to parse as JSON string
  json = JSON.parse(envValue);
} catch (e) {
  // If not JSON, treat as file path
  const content = fs.readFileSync(envValue, "utf8");
  json = JSON.parse(content);
}

// Get the correct path relative to the script location
const targetPath = path.join(__dirname, "..", "android", "app", "google-services.json");

// Ensure the directory exists
const targetDir = path.dirname(targetPath);
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

fs.writeFileSync(targetPath, JSON.stringify(json, null, 2));
console.log("google-services.json created");
