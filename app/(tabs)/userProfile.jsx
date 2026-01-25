import { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "../../constants/api";
import { useAuthStore } from "../../store/authStore";
import { useSocket } from "../../hooks/useSocket";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import COLORS from "../../constants/colors";
import Loader from "../../components/Loader";
import FriendsListModal from "../../components/FriendsListModal";
import ChatModal from "../../components/ChatModal";
import { formatMemberSince } from "../../utils/dateUtils";
import styles from "../../assets/styles/userProfile.styles";

export default function UserProfile() {
  const { userId } = useLocalSearchParams();
  const { token, user: currentUser } = useAuthStore();
  const router = useRouter();
  const socketApi = useSocket(token);

  const [profileUser, setProfileUser] = useState(null);
  const [books, setBooks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [friendStatus, setFriendStatus] = useState(null); // 'none', 'pending', 'friends', 'requested'
  const [friendCount, setFriendCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [friendsModalVisible, setFriendsModalVisible] = useState(false);
  const [chatModalUser, setChatModalUser] = useState(null);
  const [navigatingToPost, setNavigatingToPost] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchUserProfile();
    }
  }, [userId]);

  const fetchUserProfile = async () => {
    try {
      setIsLoading(true);
      
      // Fetch user profile
      const userResponse = await fetch(`${API_URL}/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!userResponse.ok) {
        throw new Error("Failed to fetch user profile");
      }

      const userData = await userResponse.json();
      setProfileUser(userData.user || userData);
      
      // Fetch user's posts
      const booksResponse = await fetch(`${API_URL}/books/user/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (booksResponse.ok) {
        const booksData = await booksResponse.json();
        setBooks(booksData.books || booksData || []);
      }

      // Fetch friend status
      await fetchFriendStatus(userData.user?._id || userData._id || userId);
      
      // Fetch friend count
      await fetchFriendCount(userData.user?._id || userData._id || userId);
    } catch (error) {
      console.error("Error fetching user profile:", error);
      Alert.alert("Error", "Failed to load user profile");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFriendStatus = async (targetUserId) => {
    try {
      const response = await fetch(`${API_URL}/friends/status/${targetUserId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setFriendStatus(data.status || 'none');
      }
    } catch (error) {
      console.error("Error fetching friend status:", error);
    }
  };

  const fetchFriendCount = async (targetUserId) => {
    try {
      const response = await fetch(`${API_URL}/friends/count/${targetUserId}`, {
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

  const handleFriendRequest = async () => {
    if (isProcessing || !profileUser) return;
    
    setIsProcessing(true);
    try {
      const targetUserId = profileUser._id || userId;
      const response = await fetch(`${API_URL}/friends/request`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ receiverId: targetUserId }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || "Failed to send friend request");
      }

      setFriendStatus('requested');
      Alert.alert("Success", "Friend request sent!");
    } catch (error) {
      console.error("Error sending friend request:", error);
      Alert.alert("Error", error.message || "Failed to send friend request");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAcceptRequest = async () => {
    if (isProcessing || !profileUser) return;
    
    setIsProcessing(true);
    try {
      const targetUserId = profileUser._id || userId;
      const response = await fetch(`${API_URL}/friends/accept`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ senderId: targetUserId }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || "Failed to accept friend request");
      }

      setFriendStatus('friends');
      setFriendCount(prev => prev + 1);
      // Refresh friend status to ensure it's updated
      await fetchFriendStatus(targetUserId);
      Alert.alert("Success", "Friend request accepted!");
    } catch (error) {
      console.error("Error accepting friend request:", error);
      Alert.alert("Error", error.message || "Failed to accept friend request");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectRequest = async () => {
    if (isProcessing || !profileUser) return;
    
    setIsProcessing(true);
    try {
      const targetUserId = profileUser._id || userId;
      const response = await fetch(`${API_URL}/friends/reject`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ senderId: targetUserId }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || "Failed to reject friend request");
      }

      setFriendStatus('none');
      Alert.alert("Success", "Friend request rejected");
    } catch (error) {
      console.error("Error rejecting friend request:", error);
      Alert.alert("Error", error.message || "Failed to reject friend request");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelRequest = async () => {
    if (isProcessing || !profileUser) return;
    
    setIsProcessing(true);
    try {
      const targetUserId = profileUser._id || userId;
      const response = await fetch(`${API_URL}/friends/cancel`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ receiverId: targetUserId }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || "Failed to cancel friend request");
      }

      setFriendStatus('none');
      Alert.alert("Success", "Friend request cancelled");
    } catch (error) {
      console.error("Error cancelling friend request:", error);
      Alert.alert("Error", error.message || "Failed to cancel friend request");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUnfriend = async () => {
    if (isProcessing || !profileUser) return;
    
    Alert.alert(
      "Unfriend",
      `Are you sure you want to unfriend ${profileUser.username}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unfriend",
          style: "destructive",
          onPress: async () => {
            setIsProcessing(true);
            try {
              const targetUserId = profileUser._id || userId;
              const response = await fetch(`${API_URL}/friends/unfriend`, {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ friendId: targetUserId }),
              });

              const data = await response.json();
              
              if (!response.ok) {
                throw new Error(data.message || "Failed to unfriend");
              }

              setFriendStatus('none');
              setFriendCount(prev => Math.max(0, prev - 1));
              Alert.alert("Success", "Unfriended successfully");
            } catch (error) {
              console.error("Error unfriending:", error);
              Alert.alert("Error", error.message || "Failed to unfriend");
            } finally {
              setIsProcessing(false);
            }
          },
        },
      ]
    );
  };

  const renderFriendButton = () => {
    if (!profileUser || currentUser?._id === profileUser._id) return null;

    if (friendStatus === 'friends') {
      return (
        <TouchableOpacity
          style={[styles.friendButton, styles.unfriendButton]}
          onPress={handleUnfriend}
          disabled={isProcessing}
        >
          <Ionicons name="person-remove-outline" size={18} color={COLORS.white} />
          <Text style={styles.friendButtonText}>Unfriend</Text>
        </TouchableOpacity>
      );
    }

    if (friendStatus === 'requested') {
      return (
        <TouchableOpacity
          style={[styles.friendButton, styles.cancelButton]}
          onPress={handleCancelRequest}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <>
              <Ionicons name="close-outline" size={18} color={COLORS.white} />
              <Text style={styles.friendButtonText}>Cancel Request</Text>
            </>
          )}
        </TouchableOpacity>
      );
    }

    if (friendStatus === 'pending') {
      return (
        <View style={styles.friendButtonContainer}>
          <TouchableOpacity
            style={[styles.friendButton, styles.acceptButton]}
            onPress={handleAcceptRequest}
            disabled={isProcessing}
          >
            <Ionicons name="checkmark-outline" size={18} color={COLORS.white} />
            <Text style={styles.friendButtonText}>Accept</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.friendButton, styles.rejectButton]}
            onPress={handleRejectRequest}
            disabled={isProcessing}
          >
            <Ionicons name="close-outline" size={18} color={COLORS.white} />
            <Text style={styles.friendButtonText}>Reject</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <TouchableOpacity
        style={[styles.friendButton, styles.addButton]}
        onPress={handleFriendRequest}
        disabled={isProcessing}
      >
        {isProcessing ? (
          <ActivityIndicator size="small" color={COLORS.white} />
        ) : (
          <>
            <Ionicons name="person-add-outline" size={18} color={COLORS.white} />
            <Text style={styles.friendButtonText}>Add Friend</Text>
          </>
        )}
      </TouchableOpacity>
    );
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
        <Text style={styles.bookDate}>
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchUserProfile();
    setRefreshing(false);
  };

  if ((isLoading && !refreshing) || navigatingToPost) return <Loader />;

  if (!profileUser) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>User Profile</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>User not found</Text>
        </View>
      </View>
    );
  }

  const canMessage = profileUser && currentUser?._id !== profileUser._id;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        {canMessage ? (
          <TouchableOpacity
            onPress={() =>
              setChatModalUser({
                _id: profileUser._id,
                username: profileUser.username,
                profileImg: profileUser.profileImg,
                email: profileUser.email,
              })
            }
            style={{ padding: 4 }}
          >
            <Ionicons name="chatbubble-outline" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 24 }} />
        )}
      </View>

      <View style={styles.profileHeader}>
        <Image
          source={{ uri: profileUser.profileImg }}
          style={styles.profileImage}
        />
        <View style={styles.profileInfo}>
          <Text style={styles.username}>{profileUser.username}</Text>
          <Text style={styles.email}>{profileUser.email}</Text>
          <Text style={styles.memberSince}>
            🗓️ Joined {formatMemberSince(profileUser.createdAt)}
          </Text>
          <TouchableOpacity
            style={styles.friendCountContainer}
            onPress={() => setFriendsModalVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="people-outline" size={16} color={COLORS.textSecondary} />
            <Text style={styles.friendCount}>
              {friendCount} {friendCount === 1 ? 'friend' : 'friends'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {renderFriendButton()}

      <View style={styles.booksHeader}>
        <Text style={styles.booksTitle}>Posts 📬</Text>
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
            <Text style={styles.emptyText}>No posts yet</Text>
          </View>
        }
      />
      <FriendsListModal
        visible={friendsModalVisible}
        onClose={() => setFriendsModalVisible(false)}
        userId={profileUser?._id || userId}
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
