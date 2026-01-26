import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import * as Haptics from "expo-haptics";

/**
 * Sound Utilities for Chat
 * Provides WhatsApp-like notification sounds for message send/receive
 * with vibration feedback support
 */

let soundObjects = {
  messageReceive: null,
  messageSend: null,
};

let isSoundEnabled = true;
let isVibrationEnabled = true;
let soundVolume = 1.0; // 0.0 to 1.0

/**
 * Initialize and cache sound objects
 * Call this once on app startup or when ChatModal opens
 */
export const initializeSounds = async () => {
  try {
    // Set audio mode to allow sounds to play
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: false,
    });

    // Create message receive sound (subtle notification)
    soundObjects.messageReceive = new Audio.Sound();
    try {
      await soundObjects.messageReceive.loadAsync(
        require("../assets/sounds/message-receive.mp3"),
      );
      await soundObjects.messageReceive.setVolumeAsync(soundVolume);
    } catch (error) {
      console.warn("message-receive.mp3 not found - using fallback");
      soundObjects.messageReceive = null;
    }

    // Create message send sound (lighter notification)
    soundObjects.messageSend = new Audio.Sound();
    try {
      await soundObjects.messageSend.loadAsync(
        require("../assets/sounds/message-send.mp3"),
      );
      await soundObjects.messageSend.setVolumeAsync(soundVolume);
    } catch (error) {
      console.warn("message-send.mp3 not found - using fallback");
      soundObjects.messageSend = null;
    }
  } catch (error) {
    console.warn("Failed to initialize sounds:", error);
  }
};

/**
 * Play message send sound with optional vibration
 * Should be called when user sends a message
 */
export const playSendSound = async () => {
  if (!isSoundEnabled) return;

  try {
    // Play vibration feedback first (quick tap)
    if (isVibrationEnabled) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    // Play sound if available
    if (soundObjects.messageSend) {
      await soundObjects.messageSend.stopAsync();
      await soundObjects.messageSend.playAsync();
    }
  } catch (error) {
    console.warn("Failed to play send sound:", error);
  }
};

/**
 * Play message receive sound with optional vibration
 * Should be called when user receives a message while in the chat
 */
export const playReceiveSound = async () => {
  if (!isSoundEnabled) return;

  try {
    // Play vibration feedback first (medium impact)
    if (isVibrationEnabled) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    // Play sound if available
    if (soundObjects.messageReceive) {
      await soundObjects.messageReceive.stopAsync();
      await soundObjects.messageReceive.playAsync();
    }
  } catch (error) {
    console.warn("Failed to play receive sound:", error);
  }
};

/**
 * Toggle sound on/off
 */
export const setSoundEnabled = (enabled) => {
  isSoundEnabled = enabled;
};

/**
 * Toggle vibration on/off
 */
export const setVibrationEnabled = (enabled) => {
  isVibrationEnabled = enabled;
};

/**
 * Set volume (0.0 to 1.0)
 */
export const setSoundVolume = async (volume) => {
  soundVolume = Math.max(0, Math.min(1, volume));

  if (soundObjects.messageSend) {
    await soundObjects.messageSend.setVolumeAsync(soundVolume);
  }
  if (soundObjects.messageReceive) {
    await soundObjects.messageReceive.setVolumeAsync(soundVolume);
  }
};

/**
 * Check if sound is enabled
 */
export const isSoundEnabledFn = () => {
  return isSoundEnabled;
};

/**
 * Check if vibration is enabled
 */
export const isVibrationEnabledFn = () => {
  return isVibrationEnabled;
};

/**
 * Get current volume
 */
export const getSoundVolume = () => {
  return soundVolume;
};

/**
 * Get audio settings as object
 */
export const getAudioSettings = () => {
  return {
    soundEnabled: isSoundEnabled,
    vibrationEnabled: isVibrationEnabled,
    volume: soundVolume,
  };
};

/**
 * Set multiple audio settings at once
 */
export const setAudioSettings = async (settings) => {
  if (typeof settings.soundEnabled === "boolean") {
    setSoundEnabled(settings.soundEnabled);
  }
  if (typeof settings.vibrationEnabled === "boolean") {
    setVibrationEnabled(settings.vibrationEnabled);
  }
  if (typeof settings.volume === "number") {
    await setSoundVolume(settings.volume);
  }
};

/**
 * Clean up sounds on app close
 */
export const cleanupSounds = async () => {
  try {
    if (soundObjects.messageReceive) {
      await soundObjects.messageReceive.unloadAsync();
      soundObjects.messageReceive = null;
    }
    if (soundObjects.messageSend) {
      await soundObjects.messageSend.unloadAsync();
      soundObjects.messageSend = null;
    }
  } catch (error) {
    console.warn("Failed to cleanup sounds:", error);
  }
};

/**
 * Create default sounds if they don't exist
 * This is a fallback - in production you should include audio files
 */
export const createDefaultSounds = async () => {
  const soundDir = `${FileSystem.documentDirectory}sounds`;

  try {
    // Check if sounds directory exists
    const dirInfo = await FileSystem.getInfoAsync(soundDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(soundDir, { intermediates: true });
    }

    // Note: You'll need to add actual sound files to your assets/sounds folder
    // For now, we just ensure the infrastructure is in place
  } catch (error) {
    console.warn("Failed to create default sounds:", error);
  }
};
