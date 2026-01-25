import Constants from "expo-constants";
import { Platform, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const PROJECT_ID = Constants.expoConfig?.extra?.eas?.projectId ?? "f09896fc-0276-49d6-b1a1-ccc397a6c49d";
const PERMISSION_ASKED_KEY = "@notification_permission_asked";

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

/**
 * Request notification permissions on first app launch
 * This should be called when the app starts, before login
 */
export async function requestNotificationPermissionsOnFirstLaunch() {
  try {
    // Check if we've already asked for permissions
    const permissionAsked = await AsyncStorage.getItem(PERMISSION_ASKED_KEY);
    if (permissionAsked === "true") {
      return; // Already asked, don't ask again
    }

    const Notifs = await getNotifications();
    if (!Notifs) return;

    // Check current permission status
    const { status: existing } = await Notifs.getPermissionsAsync();
    
    if (existing === "granted") {
      // Already granted, mark as asked
      await AsyncStorage.setItem(PERMISSION_ASKED_KEY, "true");
      return;
    }

    if (existing === "undetermined") {
      // Show a friendly message before requesting
      Alert.alert(
        "Enable Notifications",
        "Stay updated! Get notified when someone likes your posts, comments, sends you a friend request, or messages you.",
        [
          {
            text: "Not Now",
            style: "cancel",
            onPress: async () => {
              await AsyncStorage.setItem(PERMISSION_ASKED_KEY, "true");
            },
          },
          {
            text: "Enable",
            onPress: async () => {
              const { status } = await Notifs.requestPermissionsAsync();
              await AsyncStorage.setItem(PERMISSION_ASKED_KEY, "true");
              if (status === "granted" && Platform.OS === "android") {
                // Set up Android channel
                try {
                  await Notifs.setNotificationChannelAsync("default", {
                    name: "Your Meme's Notifications",
                    description: "Notifications for likes, comments, friend requests, and messages",
                    importance: Notifs.AndroidImportance.MAX,
                    vibrationPattern: [0, 250, 250, 250],
                    lightColor: "#1976D2",
                    sound: "default",
                  });
                } catch (e) {
                  // Ignore channel setup errors
                }
              }
            },
          },
        ],
        { cancelable: false }
      );
    } else {
      // Permission was denied before, mark as asked
      await AsyncStorage.setItem(PERMISSION_ASKED_KEY, "true");
    }
  } catch (e) {
    console.warn("Error requesting notification permissions:", e);
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
    
    // If not granted, try to request (but don't show alert - user already saw it)
    if (existing !== "granted") {
      const { status } = await Notifs.requestPermissionsAsync();
      final = status;
    }
    
    if (final !== "granted") return null;
    
    if (Platform.OS === "android") {
      try {
        await Notifs.setNotificationChannelAsync("default", {
          name: "Your Meme's Notifications",
          description: "Notifications for likes, comments, friend requests, and messages",
          importance: Notifs.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#1976D2",
          sound: "default",
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
    const response = await fetch(`${API_URL}/users/push-token`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token }),
    });
    if (!response.ok) {
      console.warn("Push token registration failed:", response.status);
    }
  } catch (e) {
    console.warn("Push token registration failed:", e?.message);
  }
}

/**
 * Setup notification response handler
 * This handles when user taps on a notification
 */
export function setupNotificationResponseHandler(router) {
  return async () => {
    try {
      const Notifs = await getNotifications();
      if (!Notifs) return;

      // Get the last notification response (when app was opened from notification)
      const lastResponse = await Notifs.getLastNotificationResponseAsync();
      if (lastResponse) {
        handleNotificationTap(lastResponse, router);
      }

      // Listen for future notification taps
      const subscription = Notifs.addNotificationResponseReceivedListener((response) => {
        handleNotificationTap(response, router);
      });

      return subscription;
    } catch (e) {
      console.warn("Error setting up notification response handler:", e);
      return null;
    }
  };
}

/**
 * Handle notification tap based on notification type
 */
function handleNotificationTap(response, router) {
  if (!response || !router) return;

  const data = response.notification.request.content.data;
  if (!data || !data.type) return;

  try {
    switch (data.type) {
      case "like":
        // Navigate to the post that was liked
        if (data.bookId) {
          router.push({
            pathname: "/(tabs)/index",
            params: { scrollToBookId: data.bookId },
          });
        }
        break;

      case "comment":
        // Navigate to the post and open comments
        if (data.bookId) {
          try {
            // Store flag to open comments after scrolling
            AsyncStorage.setItem("@open_comments_for_book", data.bookId);
          } catch (e) {
            // Ignore storage errors
          }
          router.push({
            pathname: "/(tabs)/index",
            params: { scrollToBookId: data.bookId },
          });
        }
        break;

      case "friend_request":
        // Navigate to user profile
        if (data.senderId) {
          router.push({
            pathname: "/(tabs)/userProfile",
            params: { userId: data.senderId },
          });
        }
        break;

      case "friend_accept":
        // Navigate to user profile who accepted
        if (data.accepterId) {
          router.push({
            pathname: "/(tabs)/userProfile",
            params: { userId: data.accepterId },
          });
        }
        break;

      case "message":
        // Navigate to profile tab where messages can be accessed
        // Store senderId in AsyncStorage so profile screen can open chat
        if (data.senderId) {
          try {
            AsyncStorage.setItem("@open_chat_with_user", data.senderId);
          } catch (e) {
            // Ignore storage errors
          }
          router.push("/(tabs)/profile");
        }
        break;

      default:
        // For unknown types, just navigate to home
        router.push("/(tabs)/index");
    }
  } catch (e) {
    console.warn("Error handling notification tap:", e);
    // Fallback to home screen
    try {
      router.push("/(tabs)/index");
    } catch (err) {
      // Ignore navigation errors
    }
  }
}
