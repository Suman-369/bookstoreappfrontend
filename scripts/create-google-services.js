const fs = require("fs");
const path = require("path");

// Get platform from environment variable (EAS sets this) or command line arguments
// EAS Build sets EXPO_PLATFORM or EAS_BUILD_PLATFORM environment variables
let platform =
  process.env.EXPO_PLATFORM ||
  process.env.EAS_BUILD_PLATFORM ||
  process.env.PLATFORM;

// If not in env, try to parse from command line arguments
// Handle various formats: --platform android, --platform=android, platform android, etc.
// Also ignore any arguments that might be passed by EAS or other tools
if (!platform) {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    // Handle --platform flag
    if (arg === "--platform" && i + 1 < args.length) {
      platform = args[i + 1];
      break;
    } else if (arg.startsWith("--platform=")) {
      platform = arg.split("=")[1];
      break;
    } else if (arg === "android" || arg === "ios") {
      platform = arg;
      break;
    }
    // Ignore other flags that might be passed (like --config, etc.)
  }
}

// Only process for Android builds (google-services.json is Android-specific)
// Exit early for non-Android platforms to avoid unnecessary processing
if (platform && platform !== "android") {
  console.log(
    `ℹ️  Skipping google-services.json creation for platform: ${platform}`,
  );
  console.log("   (google-services.json is only needed for Android builds)");
  process.exit(0);
}

// If platform is not specified, we'll proceed anyway (assume Android build)
if (!platform) {
  console.log("ℹ️  No platform specified, assuming Android build");
}

const GOOGLE_SERVICES_JSON = process.env.GOOGLE_SERVICES_JSON;
const OUTPUT_FILE = path.join(
  __dirname,
  "..",
  "android",
  "app",
  "google-services.json",
);

// Check if google-services.json already exists
if (fs.existsSync(OUTPUT_FILE)) {
  console.log("ℹ️  google-services.json already exists, skipping creation");
  console.log(`📄 Existing file: ${OUTPUT_FILE}`);
  process.exit(0);
}

// Validate environment variable exists or fall back to local file
let googleServicesPath = path.join(__dirname, "..", "google-services.json");
let useLocalFile = false;

if (!GOOGLE_SERVICES_JSON) {
  // Check if google-services.json exists locally
  if (fs.existsSync(googleServicesPath)) {
    console.log(
      "ℹ️  GOOGLE_SERVICES_JSON environment variable not set, using local google-services.json",
    );
    useLocalFile = true;
  } else {
    console.error(
      "❌ Error: GOOGLE_SERVICES_JSON environment variable is not set",
    );
    console.error("");
    console.error(
      "This script requires the GOOGLE_SERVICES_JSON secret to be set in EAS.",
    );
    console.error("");
    console.error("To set it up, run one of these commands:");
    console.error("");
    console.error("  # On macOS/Linux:");
    console.error(
      '  eas secret:create --scope project --name GOOGLE_SERVICES_JSON --value "$(cat google-services.json)"',
    );
    console.error("");
    console.error("  # On Windows (PowerShell):");
    console.error("  $content = Get-Content google-services.json -Raw");
    console.error(
      "  eas secret:create --scope project --name GOOGLE_SERVICES_JSON --value $content",
    );
    console.error("");
    console.error("  # On Windows (CMD):");
    console.error(
      '  eas secret:create --scope project --name GOOGLE_SERVICES_JSON --value "@google-services.json"',
    );
    process.exit(1);
  }
}

// Validate that the environment variable is not empty (if using env var)
if (!useLocalFile && GOOGLE_SERVICES_JSON.trim() === "") {
  console.error("❌ Error: GOOGLE_SERVICES_JSON environment variable is empty");
  console.error("Please ensure the EAS secret contains valid JSON content.");
  process.exit(1);
}

try {
  // Parse to validate JSON
  let jsonContent;

  // If using local file, read it directly
  if (useLocalFile) {
    try {
      const fileContent = fs.readFileSync(googleServicesPath, "utf8");
      jsonContent = JSON.parse(fileContent);
    } catch (fileError) {
      console.error(
        "❌ Error: Could not read or parse local google-services.json",
      );
      console.error(`   File error: ${fileError.message}`);
      console.error("");
      console.error(
        "Please verify that the file exists and contains valid JSON.",
      );
      process.exit(1);
    }
  } else {
    // Parse from environment variable
    try {
      jsonContent = JSON.parse(GOOGLE_SERVICES_JSON);
    } catch (parseError) {
      // If parsing fails, check if it's a file path
      if (fs.existsSync(GOOGLE_SERVICES_JSON)) {
        console.log(
          `ℹ️  GOOGLE_SERVICES_JSON appears to be a file path, reading from: ${GOOGLE_SERVICES_JSON}`,
        );
        try {
          const fileContent = fs.readFileSync(GOOGLE_SERVICES_JSON, "utf8");
          jsonContent = JSON.parse(fileContent);
        } catch (fileError) {
          console.error(
            "❌ Error: GOOGLE_SERVICES_JSON is a file path but could not read or parse the file",
          );
          console.error(`   File error: ${fileError.message}`);
          console.error("");
          console.error(
            "Please verify that the file exists and contains valid JSON.",
          );
          process.exit(1);
        }
      } else {
        console.error(
          "❌ Error: GOOGLE_SERVICES_JSON contains invalid JSON and is not a valid file path",
        );
        console.error(`   Parse error: ${parseError.message}`);
        console.error("");
        console.error(
          "Please verify that the EAS secret was created correctly.",
        );
        console.error(
          "The secret should contain the entire contents of google-services.json as a JSON string,",
        );
        console.error(
          "or be set to the path of the google-services.json file.",
        );
        process.exit(1);
      }
    }
  }

  // Validate that it looks like a google-services.json file
  if (!jsonContent.project_info && !jsonContent.client) {
    console.warn(
      "⚠️  Warning: The JSON does not appear to be a valid google-services.json file",
    );
    console.warn('   It should contain "project_info" or "client" fields.');
    console.warn("   Continuing anyway...");
  }

  // Ensure the directory exists
  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write to file with proper formatting
  const formattedJson = JSON.stringify(jsonContent, null, 2);
  fs.writeFileSync(OUTPUT_FILE, formattedJson, "utf8");

  // Verify the file was written correctly
  if (!fs.existsSync(OUTPUT_FILE)) {
    throw new Error("File was not created successfully");
  }

  const fileStats = fs.statSync(OUTPUT_FILE);
  if (fileStats.size === 0) {
    throw new Error("File was created but is empty");
  }

  console.log("✅ Successfully created google-services.json from EAS secret");
  console.log(`📄 File written to: ${OUTPUT_FILE}`);
  console.log(`📊 File size: ${fileStats.size} bytes`);
} catch (error) {
  console.error("❌ Error creating google-services.json:");
  console.error(`   ${error.message}`);
  if (error.code) {
    console.error(`   Error code: ${error.code}`);
  }
  if (error.stack && process.env.DEBUG) {
    console.error("   Stack trace:");
    console.error(error.stack);
  }
  process.exit(1);
}
