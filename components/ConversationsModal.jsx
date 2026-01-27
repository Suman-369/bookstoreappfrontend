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
import { decryptMessage } from "../utils/cryptoUtils";
import useKeyStorage from "../hooks/useKeyStorage";
import { useRecipientPublicKeyStore } from "../store/recipientPublicKeyStore";
import { useSocket } from "../hooks/useSocket";

export default function ConversationsModal({ visible, onClose, onStartChat }) {
  const { token, user: currentUser } = useAuthStore();
  const [view, setView] = useState("list");
  const [conversations, setConversations] = useState([]);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(false);
  const [onlineMap, setOnlineMap] = useState({});
  const [lastSeenMap, setLastSeenMap] = useState({});
  const [decryptedMessages, setDecryptedMessages] = useState({});
  const { secretKey } = useKeyStorage();
  const { cache, fetchRecipientPublicKey } = useRecipientPublicKeyStore();
  const { on, off } = useSocket(token);

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
          fetch(`${API_URL}/users/online-status?ids=${list.join(",")}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_URL}/users/last-seen?ids=${list.join(",")}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
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
    [token],
  );

  useEffect(() => {
    if (!visible || !token) return;
    const list = view === "list" ? conversations : friends;
    const ids = [...new Set(list.map((x) => x._id).filter(Boolean))];
    if (ids.length) fetchOnlineStatus(ids);
  }, [visible, token, view, conversations, friends, fetchOnlineStatus]);

  // Automatically fetch keys for conversations that need them
  useEffect(() => {
    if (conversations.length > 0 && token) {
      conversations.forEach((conv) => {
        // If we don't have the key, fetch it
        if (!cache[conv._id]) {
          fetchRecipientPublicKey(conv._id, token).catch(() => { });
        }
      });
    }
  }, [conversations, token, cache, fetchRecipientPublicKey]);

  const decryptLastMessage = useCallback(
    (conversation) => {
      try {
        const { lastMessage } = conversation;
        // Basic validation
        if (!lastMessage || !lastMessage.text) {
          if (lastMessage?.isEncrypted) return "🔒 Encrypted message";
          return lastMessage?.text || "No messages yet";
        }

        // 1. Check if message is actually encrypted
        const isEncrypted =
          lastMessage.isEncrypted &&
          lastMessage.encryptedMessage &&
          lastMessage.nonce;

        if (!isEncrypted) {
          return lastMessage.text;
        }

        if (!secretKey) {
          return "🔒 Encrypted message";
        }

        // 2. Identify the other user in this conversation
        // 'conversation' is the User object of the chat partner
        const otherUserId = conversation._id;

        // 3. Determine which key to use for decryption
        // If message is from THEM, we use THEIR public key (try msg.senderPublicKey first, then cache)
        // If message is from ME, we use THE RECIPIENT'S public key (which is otherUserId's key)
        const isFromOtherUser = lastMessage.sender === otherUserId;

        // If from other user, prefer the key attached to the message
        let keyForDecryption = isFromOtherUser ? lastMessage.senderPublicKey : null;

        // Fallback to cached key for this user
        if (!keyForDecryption) {
          keyForDecryption = cache[otherUserId]?.publicKey;
        }

        if (!keyForDecryption) {
          return "🔒 Encrypted message"; // Key not found yet
        }

        const decrypted = decryptMessage(
          {
            cipherText: lastMessage.encryptedMessage,
            nonce: lastMessage.nonce,
            senderPublicKey: keyForDecryption,
          },
          secretKey,
        );

        return decrypted || "🔒 Decryption failed";
      } catch (error) {
        // console.warn("Failed to decrypt last message:", error);
        return "🔒 Encrypted message";
      }
    },
    [secretKey, cache],
  );

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/messages/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      const convsData = data.conversations || [];
      setConversations(convsData);

      // Decrypt last messages
      if (secretKey && convsData.length > 0) {
        // Trigger a re-render/re-calc of decrypted messages when keys availability changes
        // For now, we just map immediately
        const decrypted = {};
        convsData.forEach((conv) => {
          decrypted[conv._id] = decryptLastMessage(conv);
        });
        setDecryptedMessages(decrypted);
      }
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

  // Re-run decryption when cache updates (keys arrive)
  useEffect(() => {
    if (conversations.length > 0 && secretKey) {
      const decrypted = {};
      conversations.forEach((conv) => {
        decrypted[conv._id] = decryptLastMessage(conv);
      });
      setDecryptedMessages(decrypted);
    }
  }, [cache, conversations, secretKey, decryptLastMessage]);

  // Handle incoming messages and update decrypted messages
  useEffect(() => {
    if (!visible || !secretKey) return;

    const handleNewMessage = (data) => {
      console.log("📨 New message received in ConversationsModal:", data);
      try {
        // Handle different possible data structures
        // In this app, data is usually the message object directly
        const message = data.message || data;

        // Determine conversation ID (Partner's ID)
        let conversationId;
        const senderId = typeof message.sender === 'object' ? message.sender._id : message.sender;
        const receiverId = typeof message.receiver === 'object' ? message.receiver._id : message.receiver;

        if (senderId === currentUser._id) {
          conversationId = receiverId; // I sent it, so conversation is with receiver
        } else {
          conversationId = senderId; // They sent it, so conversation is with sender
        }

        if (!conversationId) {
          console.warn("Could not determine conversationId", message);
          return;
        }

        // Try to decrypt if encrypted
        let decryptedText = message.text;
        const isEncrypted = message.isEncrypted && message.encryptedMessage && message.nonce;

        if (isEncrypted && secretKey) {
          // If NEW message comes via socket...
          // If from them: try using the key on the message
          // If from me: try using cached key
          let keyForDecryption;

          if (senderId !== currentUser._id) {
            keyForDecryption = message.senderPublicKey || cache[conversationId]?.publicKey;
          } else {
            keyForDecryption = cache[conversationId]?.publicKey;
          }

          if (keyForDecryption) {
            const result = decryptMessage({
              cipherText: message.encryptedMessage,
              nonce: message.nonce,
              senderPublicKey: keyForDecryption
            }, secretKey);
            if (result) decryptedText = result;
          }
        }

        console.log("💾 Updating decrypted messages for:", conversationId);

        // Update decrypted messages
        setDecryptedMessages((prev) => {
          const updated = {
            ...prev,
            [conversationId]: decryptedText,
          };
          return updated;
        });

        // Update conversation's last message
        setConversations((prev) => {
          // Check if conversation exists
          const exists = prev.some(c => c._id === conversationId);

          if (!exists) {
            // If we received a message from a new user not in list, we should technically re-fetch list
            // But for now, we leave it. The user can refresh.
            return prev;
          }

          const updated = prev.map((conv) =>
            conv._id === conversationId
              ? {
                ...conv,
                lastMessage: message,
                unreadCount: (conv.unreadCount || 0) + (senderId !== currentUser._id ? 1 : 0)
              }
              : conv,
          );

          // Sort to put newest first
          updated.sort((a, b) => {
            const dateA = new Date(a.lastMessage?.createdAt || 0);
            const dateB = new Date(b.lastMessage?.createdAt || 0);
            return dateB - dateA;
          });

          return updated;
        });
      } catch (error) {
        console.error("❌ Error handling new message:", error);
      }
    };

    // Listen to multiple possible event names
    on("new_message", handleNewMessage);

    return () => {
      off("new_message", handleNewMessage);
    };
  }, [visible, secretKey, cache, on, off, currentUser?._id]);

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

  const renderConversation = ({ item }) => {
    const decrypted = decryptedMessages[item._id];
    let displayText;
    if (decrypted && decrypted !== "No messages yet") {
      displayText = decrypted;
    } else if (item.unreadCount > 0) {
      displayText = "New message arrived";
    } else {
      displayText = decrypted || "No messages yet";
    }

    return (
      <TouchableOpacity
        style={styles.convItem}
        onPress={() => handleSelectConversation(item)}
        activeOpacity={0.7}
      >
        <View style={styles.avatarWrap}>
          <Image
            source={{
              uri: item.profileImg || "https://via.placeholder.com/50",
            }}
            style={styles.avatar}
          />
          {onlineMap[item._id] && <View style={styles.onlineDot} />}
        </View>
        <View style={styles.convInfo}>
          <Text style={styles.convName}>{item.username}</Text>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {displayText}
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
        <Ionicons
          name="chevron-forward"
          size={20}
          color={COLORS.textSecondary}
        />
      </TouchableOpacity>
    );
  };

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
    view === "list" ? "No conversations yet" : "No friends to message";
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
                <Ionicons
                  name="create-outline"
                  size={20}
                  color={COLORS.white}
                />
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
              <Ionicons
                name="arrow-back"
                size={24}
                color={COLORS.textPrimary}
              />
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
