const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Configuration - try multiple possible source image names
const IMAGES_DIR = path.join(__dirname, '../assets/images');
const POSSIBLE_SOURCE_IMAGES = [
  'logo-source.png',
  'logo-source.jpg',
  'logo-source.jpeg',
  'new-logo.png',
  'new-logo.jpg',
  'app-logo.png',
  'app-logo.jpg',
];

let SOURCE_IMAGE = null;
const OUTPUT_DIR = IMAGES_DIR;

// Find the source image
for (const imgName of POSSIBLE_SOURCE_IMAGES) {
  const imgPath = path.join(IMAGES_DIR, imgName);
  if (fs.existsSync(imgPath)) {
    SOURCE_IMAGE = imgPath;
    console.log(`✓ Found source image: ${imgName}\n`);
    break;
  }
}

// If not found, use the first one as default
if (!SOURCE_IMAGE) {
  SOURCE_IMAGE = path.join(IMAGES_DIR, 'logo-source.png');
}

// Icon sizes required by Expo
const ICON_SIZES = {
  'icon.png': 1024, // Main app icon (iOS/Android)
  'android-icon-foreground.png': 1024, // Android adaptive icon foreground
  'android-icon-background.jpg': 1024, // Android adaptive icon background (can be solid color)
  'android-icon-monochrome.png': 1024, // Android monochrome icon
  'splash-icon.png': 200, // Splash screen icon (width, will maintain aspect ratio)
  'favicon.png': 48, // Web favicon
  'favicon-16x16.png': 16, // Small favicon
};

async function generateIcons() {
  try {
    // Check if source image exists
    if (!fs.existsSync(SOURCE_IMAGE)) {
      console.error(`❌ Source image not found!`);
      console.log('\n📝 To use your logo:');
      console.log('   1. Save your logo image in: assets/images/');
      console.log('   2. Name it one of these: logo-source.png, logo-source.jpg, new-logo.png, app-logo.png');
      console.log('   3. Run: npm run generate-icons');
      console.log('\n   Or provide the image path as an argument:');
      console.log('   node scripts/generate-icons.js path/to/your/image.png\n');
      
      // Check if argument provided
      if (process.argv[2]) {
        const customPath = path.resolve(process.argv[2]);
        if (fs.existsSync(customPath)) {
          SOURCE_IMAGE = customPath;
          console.log(`✓ Using provided image: ${customPath}\n`);
        } else {
          console.error(`❌ Provided image not found: ${customPath}`);
          process.exit(1);
        }
      } else {
        process.exit(1);
      }
    }

    console.log('🎨 Generating app icons from source image...\n');

    // Read source image metadata
    const metadata = await sharp(SOURCE_IMAGE).metadata();
    console.log(`📐 Source image: ${metadata.width}x${metadata.height}px\n`);

    // Generate main icon (1024x1024)
    console.log('📱 Generating main app icon (1024x1024)...');
    await sharp(SOURCE_IMAGE)
      .resize(1024, 1024, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent background
      })
      .png()
      .toFile(path.join(OUTPUT_DIR, 'icon.png'));

    // Generate Android adaptive icon foreground (1024x1024)
    console.log('🤖 Generating Android foreground icon...');
    await sharp(SOURCE_IMAGE)
      .resize(1024, 1024, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(path.join(OUTPUT_DIR, 'android-icon-foreground.png'));

    // Generate Android adaptive icon background (solid color or gradient)
    // Using a light blue background matching the React-like glow
    console.log('🤖 Generating Android background icon...');
    await sharp({
      create: {
        width: 1024,
        height: 1024,
        channels: 3,
        background: { r: 230, g: 244, b: 254 } // Light blue matching app.json
      }
    })
      .jpeg({ quality: 100 })
      .toFile(path.join(OUTPUT_DIR, 'android-icon-background.jpg'));

    // Generate Android monochrome icon (1024x1024)
    console.log('🤖 Generating Android monochrome icon...');
    await sharp(SOURCE_IMAGE)
      .resize(1024, 1024, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .greyscale() // Convert to monochrome
      .png()
      .toFile(path.join(OUTPUT_DIR, 'android-icon-monochrome.png'));

    // Generate splash screen icon (200px width, maintains aspect ratio)
    console.log('💧 Generating splash screen icon...');
    await sharp(SOURCE_IMAGE)
      .resize(200, 200, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(path.join(OUTPUT_DIR, 'splash-icon.png'));

    // Generate favicon (48x48)
    console.log('🌐 Generating favicon (48x48)...');
    await sharp(SOURCE_IMAGE)
      .resize(48, 48, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(path.join(OUTPUT_DIR, 'favicon.png'));

    // Generate small favicon (16x16)
    console.log('🌐 Generating small favicon (16x16)...');
    await sharp(SOURCE_IMAGE)
      .resize(16, 16, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(path.join(OUTPUT_DIR, 'favicon-16x16.png'));

    console.log('\n✅ All icons generated successfully!');
    console.log('\n📋 Generated files:');
    Object.keys(ICON_SIZES).forEach(file => {
      console.log(`   ✓ ${file}`);
    });
    console.log('\n🚀 Next steps:');
    console.log('   1. Rebuild your app: npx expo prebuild --clean');
    console.log('   2. Or create a new build: eas build --platform android/ios');
    console.log('   3. The new icons will appear when you install the app!\n');

  } catch (error) {
    console.error('❌ Error generating icons:', error.message);
    process.exit(1);
  }
}

generateIcons();
