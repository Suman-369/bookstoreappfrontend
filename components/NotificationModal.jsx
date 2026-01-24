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
import { formatPublishDate } from "../utils/dateUtils";
import styles from "../assets/styles/notificationModal.styles";

export default function NotificationModal({ visible, onClose, onNotificationClick, onModalOpen }) {
  const { token, user } = useAuthStore();
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      fetchNotifications();
      // Call onModalOpen when modal opens to mark all as visited
      if (onModalOpen) {
        onModalOpen();
      }
    }
  }, [visible]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      // Fetch user's posts
      const booksResponse = await fetch(`${API_URL}/books/user`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!booksResponse.ok) throw new Error("Failed to fetch user posts");

      const booksData = await booksResponse.json();
      const userBooks = booksData.books || [];

      // Fetch notifications for each book
      const allNotifications = [];

      for (const book of userBooks) {
        // Fetch likes for this book
        try {
          const likesResponse = await fetch(`${API_URL}/likes/${book._id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (likesResponse.ok) {
            const likesData = await likesResponse.json();
            const likes = likesData.likes || [];

            // Add like notifications (exclude own likes)
            likes.forEach((like) => {
              if (like.user?._id !== user?._id) {
                allNotifications.push({
                  _id: `like_${like._id}`,
                  type: "like",
                  user: like.user,
                  book: {
                    _id: book._id,
                    title: book.title,
                    image: book.image,
                  },
                  createdAt: like.createdAt,
                });
              }
            });
          }
        } catch (error) {
          console.error("Error fetching likes:", error);
        }

        // Fetch comments for this book
        try {
          const commentsResponse = await fetch(`${API_URL}/comments/${book._id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (commentsResponse.ok) {
            const commentsData = await commentsResponse.json();
            const comments = commentsData.comments || [];

            // Add comment notifications (exclude own comments and replies)
            comments.forEach((comment) => {
              if (comment.user?._id !== user?._id && !comment.parentComment) {
                allNotifications.push({
                  _id: `comment_${comment._id}`,
                  type: "comment",
                  user: comment.user,
                  book: {
                    _id: book._id,
                    title: book.title,
                    image: book.image,
                  },
                  commentText: comment.text,
                  createdAt: comment.createdAt,
                });
              }
            });
          }
        } catch (error) {
          console.error("Error fetching comments:", error);
        }
      }

      // Fetch friend request notifications
      try {
        const friendRequestsResponse = await fetch(`${API_URL}/friends/requests/received`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (friendRequestsResponse.ok) {
          const friendRequestsData = await friendRequestsResponse.json();
          const friendRequests = friendRequestsData.requests || friendRequestsData || [];

          friendRequests.forEach((request) => {
            if (request.sender && request.sender._id !== user?._id) {
              allNotifications.push({
                _id: `friend_request_${request._id}`,
                type: "friend_request",
                user: request.sender,
                createdAt: request.createdAt || request.sentAt,
              });
            }
          });
        }
      } catch (error) {
        console.error("Error fetching friend requests:", error);
      }

      // Sort notifications by date (newest first)
      allNotifications.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );

      setNotifications(allNotifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderNotificationItem = ({ item }) => {
    const handlePress = () => {
      if (item.type === "friend_request") {
        // Navigate to user profile for friend requests
        if (item.user?._id) {
          onClose();
          router.push({
            pathname: "/(tabs)/userProfile",
            params: { userId: item.user._id },
          });
        }
      } else if (onNotificationClick && item.book?._id) {
        onNotificationClick(item.book._id, item._id);
      }
    };

    return (
      <TouchableOpacity 
        style={styles.notificationItem} 
        activeOpacity={0.7}
        onPress={handlePress}
      >
        <Image
          source={{ uri: item.user?.profileImg || "https://via.placeholder.com/48" }}
          style={styles.notificationAvatar}
        />
        <View style={styles.notificationContent}>
          <View style={styles.notificationTextContainer}>
            <Text style={styles.notificationText}>
              <Text style={styles.notificationUsername}>
                {item.user?.username || "User"}
              </Text>
              {item.type === "like" ? (
                <Text> liked your post</Text>
              ) : item.type === "friend_request" ? (
                <Text> wants to be your friend</Text>
              ) : (
                <Text> commented: "{item.commentText?.substring(0, 50)}
                  {item.commentText?.length > 50 ? "..." : ""}"</Text>
              )}
            </Text>
          </View>
          <Text style={styles.notificationDate}>
            {formatPublishDate(item.createdAt)}
          </Text>
        </View>
        <View style={styles.notificationIconContainer}>
          {item.type === "like" ? (
            <Ionicons name="heart" size={20} color="#e74c3c" />
          ) : item.type === "friend_request" ? (
            <Ionicons name="person-add" size={20} color={COLORS.primary} />
          ) : (
            <Ionicons name="chatbubble" size={20} color={COLORS.primary} />
          )}
        </View>
        {item.book?.image && (
          <Image
            source={{ uri: item.book.image }}
            style={styles.notificationPostImage}
          />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Notifications</Text>
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
            data={notifications}
            renderItem={renderNotificationItem}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.notificationsList}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="notifications-outline" size={48} color={COLORS.textSecondary} />
                <Text style={styles.emptyText}>No notifications yet</Text>
                <Text style={styles.emptySubtext}>
                  When people like, comment on your posts, or send friend requests, you'll see them here
                </Text>
              </View>
            }
          />
        )}
      </View>
    </Modal>
  );
}
