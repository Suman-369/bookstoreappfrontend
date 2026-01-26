import { SplashScreen, Stack, useRouter, useSegments } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import SafeScreen from "../components/SafeScreen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState, useRef } from "react";
import { useAuthStore } from "../store/authStore";
import { useFonts } from "expo-font";
import {
  registerForPushNotificationsAsync,
  registerPushTokenWithBackend,
  requestNotificationPermissionsOnFirstLaunch,
  setupNotificationResponseHandler,
} from "../utils/notifications";
import useKeyStorage from "../hooks/useKeyStorage";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { checkAuth, user, token } = useAuthStore();
  const [isReady, setIsReady] = useState(false);
  const notificationResponseSubscription = useRef(null);

  // Initialize E2EE keys on app startup
  const {
    isInitialized: keysInitialized,
    isLoading: keysLoading,
    error: keysError,
  } = useKeyStorage();

  const fontMap = {
    "JetBrainsMono-Medium": require("../assets/fonts/JetBrainsMono-Medium.ttf"),
  };
  const [fontLoaded] = useFonts(fontMap);

  useEffect(() => {
    if (fontLoaded) SplashScreen.hideAsync();
  }, [fontLoaded]);

  // Request notification permissions on first app launch
  useEffect(() => {
    const requestPermissions = async () => {
      await requestNotificationPermissionsOnFirstLaunch();
    };
    requestPermissions();
  }, []);

  // Setup notification response handler (when user taps notification)
  useEffect(() => {
    const setupHandler = async () => {
      const setupFn = setupNotificationResponseHandler(router);
      const subscription = await setupFn();
      if (subscription) {
        notificationResponseSubscription.current = subscription;
      }
    };
    setupHandler();

    return () => {
      if (
        notificationResponseSubscription.current &&
        typeof notificationResponseSubscription.current.remove === "function"
      ) {
        notificationResponseSubscription.current.remove();
      }
    };
  }, [router]);

  useEffect(() => {
    const initAuth = async () => {
      await checkAuth();
      setIsReady(true);
    };
    initAuth();
  }, []);

  // Log E2EE initialization status
  useEffect(() => {
    if (keysInitialized) {
      console.log("✅ E2EE keys initialized successfully");
    }
    if (keysError) {
      console.error("❌ E2EE keys initialization error:", keysError);
    }
  }, [keysInitialized, keysError]);

  // Register push token when user logs in
  useEffect(() => {
    if (!token || !user) return;
    (async () => {
      const pushToken = await registerForPushNotificationsAsync();
      if (pushToken) {
        await registerPushTokenWithBackend(pushToken, token);
      }
    })();
  }, [token, user]);

  useEffect(() => {
    // Listen for notifications when app is in foreground
    let subscription = null;
    (async () => {
      try {
        const NotifsModule = await import("expo-notifications");
        const Notifs = NotifsModule.default || NotifsModule;
        if (Notifs && Notifs.addNotificationReceivedListener) {
          subscription = Notifs.addNotificationReceivedListener(
            (notification) => {
              // Notification will be shown automatically by our handler
              // You can add custom handling here if needed
              console.log(
                "Notification received:",
                notification.request.content,
              );
            },
          );
        }
      } catch (e) {
        // Ignore - notifications not available in Expo Go
      }
    })();
    return () => {
      if (subscription && typeof subscription.remove === "function") {
        subscription.remove();
      }
    };
  }, []);

  useEffect(() => {
    if (!isReady || !segments || segments.length === 0) return;
    const isAuthScreen = segments[0] === "(auth)";
    const isSignedIn = user && token;
    if (!isSignedIn && !isAuthScreen) router.replace("/(auth)");
    else if (isSignedIn && isAuthScreen) router.replace("/(tabs)");
  }, [user, token, segments, isReady]);

  return (
    <SafeAreaProvider>
      <SafeScreen>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(auth)" />
        </Stack>
      </SafeScreen>
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}
