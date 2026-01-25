import { useEffect, useState } from "react";
import {
  View,
  Alert,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "../../constants/api";
import { useAuthStore } from "../../store/authStore";
import { useSocket } from "../../hooks/useSocket";
import styles from "../../assets/styles/profile.styles";
import ProfileHeader from "../../components/ProfileHeader";
import FriendsListModal from "../../components/FriendsListModal";
import ConversationsModal from "../../components/ConversationsModal";
import ChatModal from "../../components/ChatModal";
import LogoutButton from "../../components/LogoutButton";
import { Ionicons } from "@expo/vector-icons";
import COLORS from "../../constants/colors";
import { Image } from "expo-image";
import Loader from "../../components/Loader";
import { scheduleLocalNotification } from "../../utils/notifications";

export default function Profile() {
  const [books, setBooks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleteBookId, setDeleteBookId] = useState(null);
  const [friendsModalVisible, setFriendsModalVisible] = useState(false);
  const [messagesModalVisible, setMessagesModalVisible] = useState(false);
  const [chatModalUser, setChatModalUser] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [navigatingToPost, setNavigatingToPost] = useState(false);

  const { token, user } = useAuthStore();
  const socketApi = useSocket(token);

  const router = useRouter();

  const fetchData = async () => {
    try {
      setIsLoading(true);

      const response = await fetch(`${API_URL}/books/user`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to fetch user memes");

      setBooks(data.books || data);
    } catch (error) {
      console.error("Error fetching data:", error);
      Alert.alert("Error", "Failed to load profile data. Pull down to refresh.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, [token]);

  // Check if we should open a chat from a notification
  useEffect(() => {
    const checkAndOpenChat = async () => {
      try {
        const userIdToOpen = await AsyncStorage.getItem("@open_chat_with_user");
        if (userIdToOpen) {
          // Clear the flag
          await AsyncStorage.removeItem("@open_chat_with_user");
          
          // Fetch user data and open chat
          try {
            const userResponse = await fetch(`${API_URL}/users/${userIdToOpen}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (userResponse.ok) {
              const userData = await userResponse.json();
              if (userData.user) {
                setChatModalUser(userData.user);
              }
            }
          } catch (e) {
            console.warn("Failed to fetch user for chat:", e);
          }
        }
      } catch (e) {
        // Ignore errors
      }
    };
    
    if (token) {
      checkAndOpenChat();
    }
  }, [token]);

  // Listen for new messages globally to show notifications
  useEffect(() => {
    if (!socketApi?.on || !token) return;
    
    const handleNewMessage = (msg) => {
      if (!msg?.sender || !msg?.receiver) return;
      const receiverId = typeof msg.receiver === "object" ? msg.receiver._id : msg.receiver;
      const senderId = typeof msg.sender === "object" ? msg.sender._id : msg.sender;
      
      // Only show notification if message is for current user and chat is not open
      if (receiverId === user?._id && chatModalUser?._id !== senderId) {
        const senderName = typeof msg.sender === "object" ? msg.sender.username : "Someone";
        scheduleLocalNotification(
          senderName,
          msg.text?.length > 80 ? msg.text.slice(0, 77) + "…" : msg.text || "New message",
          { type: "message", senderId: String(senderId), messageId: msg._id }
        );
        fetchUnreadCount(); // Refresh count
      }
    };
    
    socketApi.on("new_message", handleNewMessage);
    return () => {
      socketApi.off("new_message", handleNewMessage);
    };
  }, [socketApi, token, user?._id, chatModalUser?._id]);

  const fetchUnreadCount = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/messages/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const total = (data.conversations || []).reduce((sum, c) => sum + (c.unreadCount || 0), 0);
        setUnreadCount(total);
      }
    } catch (e) {
      // ignore
    }
  };

  const handleDeleteBook = async (bookId) => {
    try {
      setDeleteBookId(bookId);

      const response = await fetch(`${API_URL}/books/delete/${bookId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to delete meme");

      setBooks(books.filter((book) => book._id !== bookId));
      Alert.alert("Success", "Recommendation deleted successfully");
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to delete recommendation");
    } finally {
      setDeleteBookId(null);
    }
  };

  const confirmDelete = (bookId) => {
    Alert.alert("Delete Recommendation", "Are you sure you want to delete this recommendation?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => handleDeleteBook(bookId) },
    ]);
  };

  const renderRatingStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i <= rating ? "star" : "star-outline"}
          size={14}
          color={i <= rating ? "#f4b400" : COLORS.textSecondary}
          style={{ marginRight: 2 }}
        />
      );
    }
    return stars;
  };

  const handleBookPress = async (bookId) => {
    if (!bookId || navigatingToPost) return;
    
    setNavigatingToPost(true);
    
    // Store the bookId in AsyncStorage for the home screen to pick up
    try {
      await AsyncStorage.setItem("scrollToBookId", bookId);
      
      // Navigate to home tab - use the root path which is the most reliable
      // The index tab has href="/" so we can navigate to root
      setTimeout(() => {
        try {
          // Try navigating to root path first (most reliable)
          router.push("/");
        } catch (error1) {
          try {
            // Fallback: Try with full tabs path
            router.push("/(tabs)/index");
          } catch (error2) {
            try {
              // Fallback: Try with navigate
              router.navigate("/(tabs)/index");
            } catch (error3) {
              console.error("Navigation failed:", error3);
              setNavigatingToPost(false);
              Alert.alert("Error", "Failed to navigate. Please tap the Home tab manually.");
            }
          }
        }
      }, 150);
      
      // Reset loading state after navigation completes
      setTimeout(() => {
        setNavigatingToPost(false);
      }, 2000);
    } catch (error) {
      console.error("Error navigating to post:", error);
      setNavigatingToPost(false);
      Alert.alert("Error", "Failed to navigate to post. Please try again.");
    }
  };

  const renderBookItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.bookItem} 
      onPress={() => handleBookPress(item._id)}
      activeOpacity={0.7}
    >
      <Image source={{ uri: item.image }} style={styles.bookImage} contentFit="cover" />
      <View style={styles.bookInfo}>
        <Text style={styles.bookTitle}>{item.title}</Text>
        <View style={styles.ratingContainer}>{renderRatingStars(item.rating)}</View>
        <Text style={styles.bookCaption} numberOfLines={2}>
          {item.caption}
        </Text>
        <Text style={styles.bookDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
      </View>

      <TouchableOpacity 
        style={styles.deleteButton} 
        onPress={(e) => {
          e.stopPropagation();
          confirmDelete(item._id);
        }}
      >
        {deleteBookId === item._id ? (
          <ActivityIndicator size="small" color={COLORS.primary} />
        ) : (
          <Ionicons name="trash-outline" size={20} color={COLORS.primary} />
        )}
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await new Promise((r) => setTimeout(r, 500));
    await fetchData();
    setRefreshing(false);
  };

  const handleStartChat = (user) => {
    setMessagesModalVisible(false);
    setChatModalUser(user);
  };

  if ((isLoading && !refreshing) || navigatingToPost) return <Loader />;

  return (
    <View style={styles.container}>
      <ProfileHeader
        onFriendCountPress={() => setFriendsModalVisible(true)}
        onMessagePress={() => {
          setMessagesModalVisible(true);
          fetchUnreadCount(); // Refresh when opening
        }}
        unreadCount={unreadCount}
      />
      <LogoutButton />

      {/* YOUR RECOMMENDATIONS */}
      <View style={styles.booksHeader}>
        <Text style={styles.booksTitle}>Your Recommendations 📬</Text>
        <Text style={styles.booksCount}>{books.length} meme's</Text>
      </View>

      <FlatList
        data={books}
        renderItem={renderBookItem}
        keyExtractor={(item) => item._id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.booksList}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="book-outline" size={50} color={COLORS.textSecondary} />
            <Text style={styles.emptyText}>No recommendations yet</Text>
            <TouchableOpacity style={styles.addButton} onPress={() => router.push("/create")}>
              <Text style={styles.addButtonText}>Add Your First Meme</Text>
            </TouchableOpacity>
          </View>
        }
      />
      <FriendsListModal
        visible={friendsModalVisible}
        onClose={() => setFriendsModalVisible(false)}
        userId={user?._id}
      />
      <ConversationsModal
        visible={messagesModalVisible}
        onClose={() => setMessagesModalVisible(false)}
        onStartChat={handleStartChat}
      />
      <ChatModal
        visible={!!chatModalUser}
        otherUser={chatModalUser}
        onClose={() => setChatModalUser(null)}
        socket={socketApi}
      />
    </View>
  );
}