# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Firebase Setup (google-services.json)

This project requires `google-services.json` for Android builds. The file is not tracked in git for security reasons.

### For Local Development

1. Download `google-services.json` from your Firebase Console
2. Place it in the `mobile/` directory (same level as `app.json`)
3. The file will be automatically ignored by git

### Manual Setup (if needed)

If you need to manually run the setup script (e.g., for local testing or troubleshooting):

```bash
# For Android builds
npm run setup:android -- --platform android

# For iOS builds (though google-services.json is Android-specific)
npm run setup:android -- --platform ios
```

Note: The script will automatically detect the platform from environment variables set by EAS Build. The `--platform` flag is optional but can be used to override.

### For EAS Build

The `google-services.json` file is automatically created during EAS builds from an EAS secret.

**First-time setup:**

1. Make sure you have the `google-services.json` file locally
2. Create an EAS secret with the file content:

   ```bash
   # On macOS/Linux:
   eas secret:create --scope project --name GOOGLE_SERVICES_JSON --value "$(cat google-services.json)"

   # On Windows (PowerShell):
   $content = Get-Content google-services.json -Raw
   eas secret:create --scope project --name GOOGLE_SERVICES_JSON --value $content

   # On Windows (CMD):
   eas secret:create --scope project --name GOOGLE_SERVICES_JSON --value "@google-services.json"
   ```

3. The build hook will automatically create the file during each build

**To update the secret:**

```bash
eas secret:delete --scope project --name GOOGLE_SERVICES_JSON
# Then create it again with the new content (see above)
```

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
