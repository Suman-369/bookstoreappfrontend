import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useAuthStore } from "../store/authStore";
import { API_URL } from "../constants/api";
import COLORS from "../constants/colors";
import styles from "../assets/styles/chatModal.styles";
import { scheduleLocalNotification } from "../utils/notifications";
import { formatLastSeen } from "../utils/dateUtils";

export default function ChatModal({ visible, otherUser, onClose, socket }) {
  const router = useRouter();
  const { token, user: currentUser } = useAuthStore();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [lastSeen, setLastSeen] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const listRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const markReadTimeoutRef = useRef(null);

  const currentUserId = currentUser?._id;

  const fetchMessages = useCallback(async () => {
    if (!otherUser?._id || !token) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${API_URL}/messages/${otherUser._id}?limit=50`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      const list = data.messages || [];
      setMessages(list);
    } catch (e) {
      console.error("Messages fetch:", e);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [otherUser?._id, token]);

  // Mark messages as read periodically when chat is visible
  useEffect(() => {
    if (visible && otherUser?._id && socket?.emit) {
      // Mark as read immediately when chat opens
      const markRead = () => {
        socket.emit("mark_messages_read", { otherUserId: otherUser._id });
      };
      
      // Initial mark after messages load
      markReadTimeoutRef.current = setTimeout(markRead, 500);
      
      // Mark as read periodically while chat is visible (every 2 seconds)
      const readInterval = setInterval(markRead, 2000);
      
      return () => {
        if (markReadTimeoutRef.current) {
          clearTimeout(markReadTimeoutRef.current);
        }
        clearInterval(readInterval);
      };
    }
  }, [visible, otherUser?._id, socket]);

  useEffect(() => {
    if (visible && otherUser?._id) {
      setInputText("");
      fetchMessages();
      checkBlockedStatus();
    }
  }, [visible, otherUser?._id, fetchMessages]);

  const checkBlockedStatus = useCallback(async () => {
    if (!otherUser?._id || !token) return;
    try {
      const res = await fetch(`${API_URL}/users/blocked/list`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const blockedIds = (data.blockedUsers || []).map((u) => String(u._id || u));
        setIsBlocked(blockedIds.includes(String(otherUser._id)));
      }
    } catch (e) {
      console.error("Check blocked status:", e);
    }
  }, [otherUser?._id, token]);

  // Cleanup typing indicator when chat closes
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (isTyping && socket?.emit && otherUser?._id) {
        socket.emit("typing_stop", { receiverId: otherUser._id });
      }
    };
  }, [visible, isTyping, socket, otherUser?._id]);

  const fetchOnlineStatus = useCallback(async () => {
    if (!otherUser?._id || !token) return;
    try {
      const [statusRes, lastSeenRes] = await Promise.all([
        fetch(
          `${API_URL}/users/online-status?ids=${otherUser._id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        ),
        fetch(
          `${API_URL}/users/last-seen?ids=${otherUser._id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
      ]);
      
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setIsOnline(!!statusData[otherUser._id]);
      }
      
      if (lastSeenRes.ok) {
        const lastSeenData = await lastSeenRes.json();
        setLastSeen(lastSeenData[otherUser._id] || null);
      }
    } catch (e) {
      setIsOnline(false);
      setLastSeen(null);
    }
  }, [otherUser?._id, token]);

  useEffect(() => {
    if (visible && otherUser?._id) {
      fetchOnlineStatus();
      const t = setInterval(fetchOnlineStatus, 15000);
      return () => clearInterval(t);
    }
  }, [visible, otherUser?._id, fetchOnlineStatus]);

  const scrollToEnd = useCallback(() => {
    if (listRef.current && messages.length > 0) {
      setTimeout(() => {
        try {
          listRef.current?.scrollToEnd({ animated: true });
        } catch (error) {
          // Fallback: scroll to last index
          if (messages.length > 0) {
            listRef.current?.scrollToIndex({
              index: messages.length - 1,
              animated: true,
              viewPosition: 0,
            });
          }
        }
      }, 100);
    }
  }, [messages.length]);

  useEffect(() => {
    scrollToEnd();
  }, [messages, loading]);

  const handleNewMessage = useCallback(
    (msg) => {
      if (!msg?.sender || !otherUser?._id) return;
      const senderId =
        typeof msg.sender === "object" ? msg.sender._id : msg.sender;
      const receiverId =
        typeof msg.receiver === "object" ? msg.receiver._id : msg.receiver;
      
      // Only process messages between current user and other user
      const isFromOtherUser = senderId === otherUser._id && receiverId === currentUserId;
      const isFromCurrentUser = senderId === currentUserId && receiverId === otherUser._id;
      
      if (!isFromOtherUser && !isFromCurrentUser) return;
      
      // Show local notification only if message is from other user and chat is not visible
      if (isFromOtherUser && !visible) {
        const senderName = typeof msg.sender === "object" ? msg.sender.username : "Someone";
        scheduleLocalNotification(
          senderName,
          msg.text?.length > 80 ? msg.text.slice(0, 77) + "…" : msg.text || "New message",
          { type: "message", senderId: String(senderId), messageId: msg._id }
        );
      }
      
      // If message is from other user and chat is visible, mark as read immediately
      if (isFromOtherUser && visible && socket?.emit) {
        socket.emit("mark_messages_read", { otherUserId: otherUser._id });
      }
      
      setMessages((prev) => {
        const exists = prev.some((m) => m._id === msg._id);
        if (exists) return prev;
        return [...prev, msg];
      });
    },
    [otherUser?._id, currentUserId, visible, socket]
  );

  const handleMessagesRead = useCallback(({ messageIds }) => {
    if (!messageIds?.length) return;
    const readIds = new Set(messageIds.map((id) => String(id)));
    setMessages((prev) =>
      prev.map((m) =>
        readIds.has(String(m._id)) ? { ...m, read: true } : m
      )
    );
  }, []);

  const handleMessageDeleted = useCallback(({ messageId }) => {
    setMessages((prev) => prev.filter((m) => m._id !== messageId));
  }, []);

  const handleConversationCleared = useCallback(() => {
    setMessages([]);
  }, []);

  const handleTypingStart = useCallback(({ userId: typingUserId }) => {
    if (typingUserId === otherUser?._id) {
      setIsOtherTyping(true);
    }
  }, [otherUser?._id]);

  const handleTypingStop = useCallback(({ userId: typingUserId }) => {
    if (typingUserId === otherUser?._id) {
      setIsOtherTyping(false);
    }
  }, [otherUser?._id]);

  useEffect(() => {
    if (!socket || !visible) return;
    socket.on("new_message", handleNewMessage);
    socket.on("messages_read", handleMessagesRead);
    socket.on("message_deleted", handleMessageDeleted);
    socket.on("typing_start", handleTypingStart);
    socket.on("typing_stop", handleTypingStop);
    socket.on("conversation_cleared", handleConversationCleared);
    return () => {
      socket.off("new_message", handleNewMessage);
      socket.off("messages_read", handleMessagesRead);
      socket.off("message_deleted", handleMessageDeleted);
      socket.off("typing_start", handleTypingStart);
      socket.off("typing_stop", handleTypingStop);
      socket.off("conversation_cleared", handleConversationCleared);
    };
  }, [socket, visible, handleNewMessage, handleMessagesRead, handleMessageDeleted, handleTypingStart, handleTypingStop, handleConversationCleared]);

  // Handle typing indicator
  const handleInputChange = useCallback((text) => {
    setInputText(text);
    
    // Emit typing_start when user starts typing
    if (!isTyping && socket?.emit && otherUser?._id) {
      setIsTyping(true);
      socket.emit("typing_start", { receiverId: otherUser._id });
    }
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Emit typing_stop after 2 seconds of no typing
    typingTimeoutRef.current = setTimeout(() => {
      if (socket?.emit && otherUser?._id) {
        setIsTyping(false);
        socket.emit("typing_stop", { receiverId: otherUser._id });
      }
    }, 2000);
  }, [isTyping, socket, otherUser?._id]);

  const sendMessage = async () => {
    const trimmed = inputText.trim();
    if (!trimmed || !otherUser?._id || sending) return;
    
    // Check if user is blocked
    if (isBlocked) {
      Alert.alert("Error", "You have blocked this user. Unblock them to send messages.");
      return;
    }
    
    setInputText("");
    setSending(true);
    
    // Stop typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (isTyping && socket?.emit) {
      setIsTyping(false);
      socket.emit("typing_stop", { receiverId: otherUser._id });
    }

    const addMessage = (msg) => {
      setMessages((prev) => {
        const exists = prev.some((m) => m._id === msg._id);
        if (exists) return prev;
        return [...prev, msg];
      });
    };

    if (socket?.emit) {
      socket.emit(
        "send_message",
        { receiverId: otherUser._id, text: trimmed },
        (err, saved) => {
          setSending(false);
          if (!err && saved) {
            addMessage(saved);
          } else if (err) {
            setInputText(trimmed);
            // Show error message if it's a blocking-related error
            if (err.message && (err.message.includes("blocked") || err.message.includes("cannot send"))) {
              Alert.alert("Error", err.message);
            } else {
              sendViaApi();
            }
          }
        }
      );
    } else {
      sendViaApi();
    }

    async function sendViaApi() {
      try {
        const res = await fetch(`${API_URL}/messages`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            receiverId: otherUser._id,
            text: trimmed,
          }),
        });
        const data = await res.json();
        if (res.ok && data.message) {
          addMessage(data.message);
        } else {
          setInputText(trimmed);
          // Show error message if it's a blocking-related error
          if (data.message && (data.message.includes("blocked") || data.message.includes("cannot send"))) {
            Alert.alert("Error", data.message);
          }
        }
      } catch (e) {
        setInputText(trimmed);
        console.error("Send message error:", e);
      } finally {
        setSending(false);
      }
    }
  };

  const handleDeleteMessage = useCallback(async (messageId) => {
    Alert.alert(
      "Delete Message",
      "Are you sure you want to delete this message?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              if (socket?.emit) {
                socket.emit("delete_message", { messageId }, (err) => {
                  if (err) {
                    // Fallback to API
                    deleteViaApi();
                  }
                });
              } else {
                deleteViaApi();
              }
            } catch (e) {
              console.error("Delete error:", e);
            }
          },
        },
      ]
    );

    async function deleteViaApi() {
      try {
        const res = await fetch(`${API_URL}/messages/${messageId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to delete");
        setMessages((prev) => prev.filter((m) => m._id !== messageId));
      } catch (e) {
        Alert.alert("Error", "Failed to delete message");
      }
    }
  }, [socket, token]);

  const handleClearChat = useCallback(async () => {
    if (!otherUser?._id || !token) return;
    
    Alert.alert(
      "Clear Chat",
      "Are you sure you want to delete all messages in this conversation? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await fetch(
                `${API_URL}/messages/conversation/${otherUser._id}`,
                {
                  method: "DELETE",
                  headers: { Authorization: `Bearer ${token}` },
                }
              );
              if (res.ok) {
                setMessages([]);
                Alert.alert("Success", "Chat cleared successfully");
              } else {
                const data = await res.json();
                Alert.alert("Error", data.message || "Failed to clear chat");
              }
            } catch (e) {
              console.error("Clear chat error:", e);
              Alert.alert("Error", "Failed to clear chat");
            }
          },
        },
      ]
    );
  }, [otherUser?._id, token]);

  const handleBlockUser = useCallback(async () => {
    if (!otherUser?._id || !token) return;
    
    const action = isBlocked ? "unblock" : "block";
    const actionText = isBlocked ? "Unblock" : "Block";
    const message = isBlocked
      ? `Are you sure you want to unblock ${otherUser.username}?`
      : `Are you sure you want to block ${otherUser.username}? They won't be able to send you messages.`;

    Alert.alert(
      `${actionText} User`,
      message,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: actionText,
          style: isBlocked ? "default" : "destructive",
          onPress: async () => {
            try {
              const res = await fetch(`${API_URL}/users/${action}`, {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ userId: otherUser._id }),
              });
              if (res.ok) {
                setIsBlocked(!isBlocked);
                if (!isBlocked) {
                  // If blocking, clear the chat and close modal
                  setMessages([]);
                  Alert.alert("Success", "User blocked successfully", [
                    { text: "OK", onPress: onClose },
                  ]);
                } else {
                  Alert.alert("Success", "User unblocked successfully");
                }
              } else {
                const data = await res.json();
                Alert.alert("Error", data.message || `Failed to ${action} user`);
              }
            } catch (e) {
              console.error(`${action} user error:`, e);
              Alert.alert("Error", `Failed to ${action} user`);
            }
          },
        },
      ]
    );
  }, [otherUser, token, isBlocked, onClose]);

  const renderMessage = ({ item }) => {
    const isSent =
      (typeof item.sender === "object" ? item.sender._id : item.sender) ===
      currentUserId;
    const read = !!item.read;
    return (
      <TouchableOpacity
        style={[
          styles.messageBubble,
          isSent ? styles.bubbleSent : styles.bubbleReceived,
        ]}
        onLongPress={() => {
          // Only allow deletion of own messages
          if (isSent) {
            handleDeleteMessage(item._id);
          }
        }}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.messageText,
            isSent && styles.messageTextSent,
          ]}
          selectable
        >
          {item.text}
        </Text>
        <View
          style={[
            styles.messageTimeRow,
            !isSent && styles.messageTimeRowReceived,
          ]}
        >
          <Text
            style={[
              styles.messageTime,
              isSent && styles.messageTimeSent,
            ]}
          >
            {item.createdAt
              ? new Date(item.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : ""}
          </Text>
          {isSent && (
            <Ionicons
              name={read ? "checkmark-done" : "checkmark"}
              size={16}
              color={read ? "#4FC3F7" : "rgba(255,255,255,0.7)"}
              style={styles.tickIcon}
            />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (!otherUser) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {showMenu && (
          <TouchableOpacity
            style={styles.menuBackdrop}
            activeOpacity={1}
            onPress={() => setShowMenu(false)}
          />
        )}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={{ flexDirection: "row", alignItems: "center", flex: 1 }}
            onPress={() => {
              onClose();
              router.push({
                pathname: "/(tabs)/userProfile",
                params: { userId: otherUser._id },
              });
            }}
            activeOpacity={0.7}
          >
            <View style={{ position: "relative" }}>
              <Image
                source={{
                  uri: otherUser.profileImg || "https://via.placeholder.com/40",
                }}
                style={styles.headerAvatar}
              />
              {isOnline && (
                <View
                  style={{
                    position: "absolute",
                    right: 0,
                    bottom: 0,
                    width: 12,
                    height: 12,
                    borderRadius: 6,
                    backgroundColor: "#4CAF50",
                    borderWidth: 2,
                    borderColor: COLORS.cardBackground,
                  }}
                />
              )}
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.headerName}>{otherUser.username}</Text>
              <Text style={styles.lastSeenText}>
                {formatLastSeen(lastSeen, isOnline)}
              </Text>
            </View>
          </TouchableOpacity>
          <View style={styles.menuButtonContainer}>
            <TouchableOpacity
              onPress={() => setShowMenu(!showMenu)}
              style={styles.menuButton}
              activeOpacity={0.7}
            >
              <Ionicons
                name={showMenu ? "close" : "ellipsis-vertical"}
                size={24}
                color={COLORS.textPrimary}
              />
            </TouchableOpacity>
            
            {/* Menu Dropdown */}
            {showMenu && (
              <View style={styles.menuContainer}>
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      setShowMenu(false);
                      handleClearChat();
                    }}
                    activeOpacity={0.6}
                  >
                    <Ionicons name="trash-outline" size={22} color={COLORS.textPrimary} />
                    <Text style={styles.menuItemText}>Clear Chat</Text>
                  </TouchableOpacity>
                  <View style={styles.menuDivider} />
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      setShowMenu(false);
                      handleBlockUser();
                    }}
                    activeOpacity={0.6}
                  >
                    <Ionicons
                      name={isBlocked ? "lock-open-outline" : "lock-closed-outline"}
                      size={22}
                      color={isBlocked ? COLORS.primary : "#FF3B30"}
                    />
                    <Text
                      style={[
                        styles.menuItemText,
                        isBlocked && { color: COLORS.primary },
                        !isBlocked && { color: "#FF3B30" },
                      ]}
                    >
                      {isBlocked ? "Unblock User" : "Block User"}
                    </Text>
                  </TouchableOpacity>
                </View>
            )}
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item._id}
            contentContainerStyle={[
              messages.length > 0 
                ? { paddingHorizontal: 16, paddingVertical: 12, flexGrow: 1 } 
                : styles.messagesList,
              !messages.length && { flexGrow: 1, justifyContent: "center" },
            ]}
            style={{ flex: 1 }}
            onContentSizeChange={scrollToEnd}
            showsVerticalScrollIndicator={true}
            inverted={false}
            onScrollToIndexFailed={(info) => {
              // Fallback if scrollToIndex fails
              const wait = new Promise((resolve) => setTimeout(resolve, 500));
              wait.then(() => {
                if (listRef.current && messages.length > 0) {
                  try {
                    listRef.current.scrollToEnd({ animated: true });
                  } catch (error) {
                    console.log("Scroll failed:", error);
                  }
                }
              });
            }}
            ListEmptyComponent={
              <View style={styles.emptyChat}>
                <Ionicons
                  name="chatbubble-outline"
                  size={48}
                  color={COLORS.textSecondary}
                />
                <Text style={styles.emptyText}>No messages yet</Text>
                <Text style={styles.emptyText}>
                  Say Hi to {otherUser.username} 🤗 !
                </Text>
              </View>
            }
          />
        )}

        {isOtherTyping && (
          <View style={styles.typingIndicator}>
            <Text style={styles.typingText}>
              {otherUser?.username || "Someone"} is typing...
            </Text>
          </View>
        )}

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={handleInputChange}
            placeholder="Message..."
            placeholderTextColor={COLORS.placeholderText}
            multiline
            maxLength={2000}
            editable={!sending}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || sending) && { opacity: 0.5 },
            ]}
            onPress={sendMessage}
            disabled={!inputText.trim() || sending}
            activeOpacity={0.7}
          >
            {sending ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Ionicons name="send" size={20} color={COLORS.white} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
