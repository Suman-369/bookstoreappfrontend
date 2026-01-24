import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useAuthStore } from "../store/authStore";
import { API_URL } from "../constants/api";
import COLORS from "../constants/colors";
import styles from "../assets/styles/friendsListModal.styles";

export default function FriendsListModal({ visible, onClose, userId }) {
  const { token, user: currentUser } = useAuthStore();
  const router = useRouter();
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && userId) {
      fetchFriends();
    }
  }, [visible, userId]);

  const fetchFriends = async () => {
    setLoading(true);
    try {
      // If viewing another user's profile, get their friends
      const endpoint = userId && userId !== currentUser?._id 
        ? `${API_URL}/friends/list/${userId}`
        : `${API_URL}/friends/list`;

      const response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch friends");
      }

      const data = await response.json();
      setFriends(data.friends || []);
    } catch (error) {
      console.error("Error fetching friends:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFriendPress = (friendId) => {
    onClose();
    router.push({
      pathname: "/(tabs)/userProfile",
      params: { userId: friendId },
    });
  };

  const renderFriendItem = ({ item }) => (
    <TouchableOpacity
      style={styles.friendItem}
      onPress={() => handleFriendPress(item._id)}
      activeOpacity={0.7}
    >
      <Image
        source={{ uri: item.profileImg || "https://via.placeholder.com/50" }}
        style={styles.friendAvatar}
      />
      <View style={styles.friendInfo}>
        <Text style={styles.friendName}>{item.username}</Text>
        <Text style={styles.friendEmail} numberOfLines={1}>
          {item.email}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Friends</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <FlatList
            data={friends}
            renderItem={renderFriendItem}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.friendsList}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={48} color={COLORS.textSecondary} />
                <Text style={styles.emptyText}>No friends yet</Text>
                <Text style={styles.emptySubtext}>
                  Start adding friends to see them here
                </Text>
              </View>
            }
          />
        )}
      </View>
    </Modal>
  );
}
