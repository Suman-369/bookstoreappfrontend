import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Switch,
  ScrollView,
  StyleSheet,
  Alert,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import COLORS from "../constants/colors";
import {
  getAudioSettings,
  setAudioSettings,
  setSoundVolume,
  getSoundVolume,
} from "../utils/soundUtils";

/**
 * ChatAudioSettings Component
 * Allows users to configure chat notification sounds and vibration
 *
 * Usage in your settings/preferences screen:
 * <ChatAudioSettings />
 */
const ChatAudioSettings = ({ onClose }) => {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [volume, setVolume] = useState(1.0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Load current settings
    const settings = getAudioSettings();
    setSoundEnabled(settings.soundEnabled);
    setVibrationEnabled(settings.vibrationEnabled);
    setVolume(settings.volume);
  }, []);

  const handleSoundToggle = async (value) => {
    setSoundEnabled(value);
    await setAudioSettings({ soundEnabled: value });
  };

  const handleVibrationToggle = async (value) => {
    setVibrationEnabled(value);
    await setAudioSettings({ vibrationEnabled: value });
  };

  const handleVolumeChange = async (newVolume) => {
    setVolume(newVolume);
    await setSoundVolume(newVolume);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Chat Notifications</Text>
        <Text style={styles.subtitle}>
          Configure sound and vibration settings
        </Text>
      </View>

      {/* Sound Toggle */}
      <View style={styles.settingCard}>
        <View style={styles.settingLeft}>
          <Ionicons
            name="volume-high"
            size={24}
            color={COLORS.primary}
            style={styles.icon}
          />
          <View style={styles.settingText}>
            <Text style={styles.settingTitle}>Message Sounds</Text>
            <Text style={styles.settingDescription}>
              {soundEnabled
                ? "Sounds enabled for sent and received messages"
                : "Sounds disabled"}
            </Text>
          </View>
        </View>
        <Switch
          value={soundEnabled}
          onValueChange={handleSoundToggle}
          trackColor={{ false: "#767577", true: COLORS.primary }}
          thumbColor={soundEnabled ? COLORS.primary : "#f4f3f4"}
        />
      </View>

      {/* Vibration Toggle */}
      <View style={styles.settingCard}>
        <View style={styles.settingLeft}>
          <Ionicons
            name="phone-portrait"
            size={24}
            color={COLORS.primary}
            style={styles.icon}
          />
          <View style={styles.settingText}>
            <Text style={styles.settingTitle}>Vibration</Text>
            <Text style={styles.settingDescription}>
              {vibrationEnabled
                ? "Vibration enabled with notifications"
                : "Vibration disabled"}
            </Text>
          </View>
        </View>
        <Switch
          value={vibrationEnabled}
          onValueChange={handleVibrationToggle}
          trackColor={{ false: "#767577", true: COLORS.primary }}
          thumbColor={vibrationEnabled ? COLORS.primary : "#f4f3f4"}
        />
      </View>

      {/* Volume Control */}
      <View style={styles.volumeCard}>
        <View style={styles.volumeHeader}>
          <Ionicons
            name="volume-mute"
            size={20}
            color={COLORS.primary}
            style={styles.icon}
          />
          <Text style={styles.settingTitle}>Volume</Text>
          <Text style={styles.volumePercent}>{Math.round(volume * 100)}%</Text>
        </View>
        <View style={styles.volumeSliderContainer}>
          {[0, 0.25, 0.5, 0.75, 1.0].map((val) => (
            <TouchableOpacity
              key={val}
              style={[
                styles.volumeButton,
                Math.abs(volume - val) < 0.05 && styles.volumeButtonActive,
              ]}
              onPress={() => handleVolumeChange(val)}
            >
              <Text
                style={[
                  styles.volumeButtonText,
                  Math.abs(volume - val) < 0.05 &&
                    styles.volumeButtonTextActive,
                ]}
              >
                {val === 0
                  ? "0"
                  : val === 1
                    ? "100"
                    : `${Math.round(val * 100)}`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Info Section */}
      <View style={styles.infoCard}>
        <Ionicons name="information-circle" size={20} color={COLORS.primary} />
        <View style={styles.infoText}>
          <Text style={styles.infoTitle}>About Notification Sounds</Text>
          <Text style={styles.infoDescription}>
            • Send Sound: Plays when you send a message{"\n"}• Receive Sound:
            Plays when you receive a message while in chat{"\n"}• Vibration:
            Haptic feedback with each notification
          </Text>
        </View>
      </View>

      {onClose && (
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>Done</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 16,
  },
  header: {
    marginBottom: 24,
    marginTop: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
  },
  settingCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  icon: {
    marginRight: 12,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 12,
    color: "#999",
  },
  volumeCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  volumeHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  volumePercent: {
    marginLeft: "auto",
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.primary,
  },
  volumeSliderContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    gap: 8,
  },
  volumeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  volumeButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  volumeButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
  },
  volumeButtonTextActive: {
    color: "white",
  },
  infoCard: {
    flexDirection: "row",
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 8,
  },
  infoDescription: {
    fontSize: 12,
    color: "#666",
    lineHeight: 18,
  },
  closeButton: {
    marginTop: 24,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 24,
  },
  closeButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default ChatAudioSettings;
