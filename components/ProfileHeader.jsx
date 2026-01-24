import { View, Text, TouchableOpacity } from "react-native";
import { useEffect, useState } from "react";
import { useAuthStore } from "../store/authStore";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import styles from "../assets/styles/profile.styles";
import { formatMemberSince } from "../utils/dateUtils";
import { API_URL } from "../constants/api";
import COLORS from "../constants/colors";

export default function ProfileHeader({ onFriendCountPress }) {
  const { user, token } = useAuthStore();
  const [friendCount, setFriendCount] = useState(0);

  useEffect(() => {
    if (user?._id) {
      fetchFriendCount();
    }
  }, [user?._id]);

  const fetchFriendCount = async () => {
    try {
      const response = await fetch(`${API_URL}/friends/count/${user._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setFriendCount(data.count || 0);
      }
    } catch (error) {
      console.error("Error fetching friend count:", error);
    }
  };

  if (!user) return null;

  return (
    <View style={styles.profileHeader}>
      <Image source={{ uri: user.profileImg }} style={styles.profileImage} />

      <View style={styles.profileInfo}>
        <Text style={styles.username}>{user.username}</Text>
        <Text style={styles.email}>{user.email}</Text>
        <Text style={styles.memberSince}>🗓️ Joined {formatMemberSince(user.createdAt)}</Text>
        <TouchableOpacity
          style={styles.friendCountContainer}
          onPress={onFriendCountPress}
          activeOpacity={0.7}
        >
          <Ionicons name="people-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.friendCount}>
            {friendCount} {friendCount === 1 ? 'friend' : 'friends'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}