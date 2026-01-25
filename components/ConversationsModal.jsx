import React, { useState, useEffect, useCallback } from "react";
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
import styles from "../assets/styles/conversationsModal.styles";
import { formatLastSeen } from "../utils/dateUtils";

export default function ConversationsModal({ visible, onClose, onStartChat }) {
  const { token, user: currentUser } = useAuthStore();
  const [view, setView] = useState("list");
  const [conversations, setConversations] = useState([]);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(false);
  const [onlineMap, setOnlineMap] = useState({});
  const [lastSeenMap, setLastSeenMap] = useState({});

  useEffect(() => {
    if (visible && token) {
      if (view === "list") fetchConversations();
      else if (view === "new") fetchFriends();
    }
  }, [visible, token, view]);

  const fetchOnlineStatus = useCallback(
    async (ids) => {
      const list = (ids || []).filter(Boolean);
      if (!list.length || !token) return;
      try {
        const [statusRes, lastSeenRes] = await Promise.all([
          fetch(
            `${API_URL}/users/online-status?ids=${list.join(",")}`,
            { headers: { Authorization: `Bearer ${token}` } }
          ),
          fetch(
            `${API_URL}/users/last-seen?ids=${list.join(",")}`,
            { headers: { Authorization: `Bearer ${token}` } }
          )
        ]);
        
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          setOnlineMap((prev) => ({ ...prev, ...statusData }));
        }
        
        if (lastSeenRes.ok) {
          const lastSeenData = await lastSeenRes.json();
          setLastSeenMap((prev) => ({ ...prev, ...lastSeenData }));
        }
      } catch (e) {
        /* ignore */
      }
    },
    [token]
  );

  useEffect(() => {
    if (!visible || !token) return;
    const list = view === "list" ? conversations : friends;
    const ids = [...new Set(list.map((x) => x._id).filter(Boolean))];
    if (ids.length) fetchOnlineStatus(ids);
  }, [visible, token, view, conversations, friends, fetchOnlineStatus]);

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/messages/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch (e) {
      console.error("Conversations fetch:", e);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchFriends = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/friends/list`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setFriends(data.friends || []);
    } catch (e) {
      console.error("Friends fetch:", e);
      setFriends([]);
    } finally {
      setLoading(false);
    }
  };

  const handleNewMessage = () => {
    setView("new");
  };

  const handleBack = () => {
    setView("list");
  };

  const handleSelectConversation = (c) => {
    const user = {
      _id: c._id,
      username: c.username,
      profileImg: c.profileImg,
      email: c.email,
    };
    onStartChat?.(user);
  };

  const handleSelectFriend = (f) => {
    onStartChat?.(f);
  };

  const renderConversation = ({ item }) => (
    <TouchableOpacity
      style={styles.convItem}
      onPress={() => handleSelectConversation(item)}
      activeOpacity={0.7}
    >
      <View style={styles.avatarWrap}>
        <Image
          source={{ uri: item.profileImg || "https://via.placeholder.com/50" }}
          style={styles.avatar}
        />
        {onlineMap[item._id] && <View style={styles.onlineDot} />}
      </View>
      <View style={styles.convInfo}>
        <Text style={styles.convName}>{item.username}</Text>
        <Text style={styles.lastMessage} numberOfLines={1}>
          {item.lastMessage?.text ?? "No messages yet"}
        </Text>
        <Text style={styles.lastSeenText} numberOfLines={1}>
          {formatLastSeen(lastSeenMap[item._id], onlineMap[item._id])}
        </Text>
      </View>
      {item.unreadCount > 0 && (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadText}>
            {item.unreadCount > 99 ? "99+" : item.unreadCount}
          </Text>
        </View>
      )}
      <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
    </TouchableOpacity>
  );

  const renderFriend = ({ item }) => (
    <TouchableOpacity
      style={styles.convItem}
      onPress={() => handleSelectFriend(item)}
      activeOpacity={0.7}
    >
      <View style={styles.avatarWrap}>
        <Image
          source={{ uri: item.profileImg || "https://via.placeholder.com/50" }}
          style={styles.avatar}
        />
        {onlineMap[item._id] && <View style={styles.onlineDot} />}
      </View>
      <View style={styles.convInfo}>
        <Text style={styles.convName}>{item.username}</Text>
        <Text style={styles.lastMessage} numberOfLines={1}>
          {item.email}
        </Text>
        <Text style={styles.lastSeenText} numberOfLines={1}>
          {formatLastSeen(lastSeenMap[item._id], onlineMap[item._id])}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
    </TouchableOpacity>
  );

  const list = view === "list" ? conversations : friends;
  const renderItem = view === "list" ? renderConversation : renderFriend;
  const keyExtractor = (item) => item._id;
  const emptyText =
    view === "list"
      ? "No conversations yet"
      : "No friends to message";
  const emptySubtext =
    view === "list"
      ? "Tap 'New message' to start a chat"
      : "Add friends first to message them";

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={view === "new" ? handleBack : onClose}
    >
      <View style={styles.container}>
        {view === "list" ? (
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Messages</Text>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <TouchableOpacity
                style={[styles.newMessageButton, { marginRight: 12 }]}
                onPress={handleNewMessage}
                activeOpacity={0.7}
              >
                <Ionicons name="create-outline" size={20} color={COLORS.white} />
                <Text style={styles.newMessageText}>New message</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.subHeader}>
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.subHeaderTitle}>New message</Text>
          </View>
        )}

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <FlatList
            style={styles.listWrapper}
            data={list}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons
                  name="chatbubbles-outline"
                  size={48}
                  color={COLORS.textSecondary}
                />
                <Text style={styles.emptyText}>{emptyText}</Text>
                <Text style={styles.emptySubtext}>{emptySubtext}</Text>
              </View>
            }
          />
        )}
      </View>
    </Modal>
  );
}
