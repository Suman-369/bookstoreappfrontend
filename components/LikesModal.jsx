import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useAuthStore } from "../store/authStore";
import { API_URL } from "../constants/api";
import COLORS from "../constants/colors";
import { formatPublishDate } from "../utils/dateUtils";
import styles from "../assets/styles/likesModal.styles";

export default function LikesModal({ visible, onClose, bookId }) {
  const { token } = useAuthStore();
  const [likes, setLikes] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && bookId) {
      fetchLikes();
    }
  }, [visible, bookId]);

  const fetchLikes = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/likes/${bookId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch likes");

      const data = await response.json();
      setLikes(data.likes || []);
    } catch (error) {
      console.error("Error fetching likes:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderLikeItem = ({ item }) => (
    <View style={styles.likeItem}>
      <Image
        source={{ uri: item.user?.profileImg || "https://via.placeholder.com/40" }}
        style={styles.likeAvatar}
      />
      <View style={styles.likeInfo}>
        <Text style={styles.likeUsername}>{item.user?.username || "User"}</Text>
        <Text style={styles.likeDate}>Liked {formatPublishDate(item.createdAt)}</Text>
      </View>
    </View>
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
          <Text style={styles.headerTitle}>Likes</Text>
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
            data={likes}
            renderItem={renderLikeItem}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.likesList}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="heart-outline" size={48} color={COLORS.textSecondary} />
                <Text style={styles.emptyText}>No likes yet</Text>
                <Text style={styles.emptySubtext}>Be the first to like this post!</Text>
              </View>
            }
          />
        )}
      </View>
    </Modal>
  );
}
