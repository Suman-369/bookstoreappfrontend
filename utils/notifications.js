import Constants from "expo-constants";
import { Platform } from "react-native";

const PROJECT_ID = Constants.expoConfig?.extra?.eas?.projectId ?? "f09896fc-0276-49d6-b1a1-ccc397a6c49d";

// Check if we're in Expo Go (where push notifications don't work)
const isExpoGo = Constants.executionEnvironment === "storeClient" || 
                 Constants.appOwnership === "expo" ||
                 !Constants.isDevice;

let Notifications = null;
let handlerInitialized = false;
let loadAttempted = false;

async function getNotifications() {
  // Always try to load for local notifications, even in Expo Go
  if (Notifications) return Notifications;
  
  if (loadAttempted) return Notifications;
  loadAttempted = true;
  
  try {
    const NotifsModule = await import("expo-notifications");
    Notifications = NotifsModule.default || NotifsModule;
    if (!handlerInitialized && Notifications) {
      try {
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
            shouldShowBanner: true,
            shouldShowList: true,
            priority: Notifications.AndroidNotificationPriority?.HIGH || 5,
          }),
        });
        handlerInitialized = true;
      } catch (e) {
        // Ignore handler setup errors
      }
    }
    return Notifications;
  } catch (e) {
    // Silently fail - expo-notifications may not be available
    return null;
  }
}

export async function registerForPushNotificationsAsync() {
  // Skip push token registration in Expo Go, but allow local notifications
  if (isExpoGo) return null;
  
  try {
    const Notifs = await getNotifications();
    if (!Notifs) return null;

    const { status: existing } = await Notifs.getPermissionsAsync();
    let final = existing;
    if (existing !== "granted") {
      const { status } = await Notifs.requestPermissionsAsync();
      final = status;
    }
    if (final !== "granted") return null;
    if (Platform.OS === "android") {
      try {
        await Notifs.setNotificationChannelAsync("default", {
          name: "default",
          importance: Notifs.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#1976D2",
        });
      } catch (e) {
        // Ignore channel setup errors
      }
    }
    try {
      const tokenResult = await Notifs.getExpoPushTokenAsync({
        projectId: PROJECT_ID,
      });
      return tokenResult?.data ?? null;
    } catch (e) {
      // Push tokens not available - that's okay, we'll use local notifications
      return null;
    }
  } catch (e) {
    return null;
  }
}

export async function scheduleLocalNotification(title, body, data = {}) {
  try {
    const Notifs = await getNotifications();
    if (!Notifs) return;
    await Notifs.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
        priority: Notifs.AndroidNotificationPriority.HIGH,
      },
      trigger: null, // Show immediately
    });
  } catch (e) {
    // Silently fail - notifications may not be available in Expo Go
  }
}

export async function registerPushTokenWithBackend(token, authToken) {
  if (!token || !authToken) return;
  const { API_URL } = await import("../constants/api");
  try {
    await fetch(`${API_URL}/users/push-token`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token }),
    });
  } catch (e) {
    console.warn("Push token registration failed:", e?.message);
  }
}
