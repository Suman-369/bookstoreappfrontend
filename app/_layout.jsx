import { SplashScreen, Stack, useRouter, useSegments } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import SafeScreen from "../components/SafeScreen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { useAuthStore } from "../store/authStore";
import { useFonts } from "expo-font";
import { registerForPushNotificationsAsync, registerPushTokenWithBackend } from "../utils/notifications";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { checkAuth, user, token } = useAuthStore();
  const [isReady, setIsReady] = useState(false);

  const fontMap = { "JetBrainsMono-Medium": require("../assets/fonts/JetBrainsMono-Medium.ttf") };
  const [fontLoaded] = useFonts(fontMap);

  useEffect(() => {
    if (fontLoaded) SplashScreen.hideAsync();
  }, [fontLoaded]);

  useEffect(() => {
    const initAuth = async () => {
      await checkAuth();
      setIsReady(true);
    };
    initAuth();
  }, []);

  useEffect(() => {
    if (!token || !user) return;
    (async () => {
      const pushToken = await registerForPushNotificationsAsync();
      if (pushToken) await registerPushTokenWithBackend(pushToken, token);
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
          subscription = Notifs.addNotificationReceivedListener((notification) => {
            // Notification will be shown automatically by our handler
            // You can add custom handling here if needed
            console.log("Notification received:", notification.request.content);
          });
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
