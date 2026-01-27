import fs from "fs";

const content = process.env.GOOGLE_SERVICES_JSON;

if (!content) {
  console.log("GOOGLE_SERVICES_JSON not found");
  process.exit(0);
}

fs.writeFileSync("google-services.json", content);
console.log("google-services.json created");
