import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useAuthStore } from "../../store/authStore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";

import { Image } from "expo-image";
import { useEffect, useState, useRef } from "react";

import styles from "../../assets/styles/home.styles";
import { API_URL } from "../../constants/api";
import { Ionicons } from "@expo/vector-icons";
import { formatPublishDate } from "../../utils/dateUtils";
import COLORS from "../../constants/colors";
import Loader from "../../components/Loader";
import CommentModal from "../../components/CommentModal";
import LikesModal from "../../components/LikesModal";
import NotificationModal from "../../components/NotificationModal";

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default function Home() {
  const { token, user } = useAuthStore();
  const router = useRouter();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [likesModalVisible, setLikesModalVisible] = useState(false);
  const [notificationModalVisible, setNotificationModalVisible] = useState(false);
  const [selectedBookId, setSelectedBookId] = useState(null);
  const [likingBookId, setLikingBookId] = useState(null);
  const [notificationCount, setNotificationCount] = useState(0);
  const [visitedNotifications, setVisitedNotifications] = useState(new Set());
  const flatListRef = useRef(null);

  const handleUserProfilePress = (userId) => {
    if (userId) {
      router.push({
        pathname: "/(tabs)/userProfile",
        params: { userId },
      });
    }
  };

  const fetchBooks = async (pageNum = 1, refresh = false) => {
    try {
      if (refresh) setRefreshing(true);
      else if (pageNum === 1) setLoading(true);

      const response = await fetch(`${API_URL}/books/all?page=${pageNum}&limit=2`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to fetch books");

      
      const uniqueBooks =
        refresh || pageNum === 1
          ? data.books
          : Array.from(new Set([...books, ...data.books].map((book) => book._id))).map((id) =>
              [...books, ...data.books].find((book) => book._id === id)
            );

      setBooks(uniqueBooks);

      setHasMore(pageNum < data.totalPages);
      setPage(pageNum);
    } catch (error) {
      console.log("Error fetching books", error);
    } finally {
      if (refresh) {
        await sleep(800);
        setRefreshing(false);
      } else setLoading(false);
    }
  };

  useEffect(() => {
    const initialize = async () => {
      await loadVisitedNotifications();
      await fetchBooks();
      // Wait a bit for visitedNotifications to be set
      setTimeout(() => {
        fetchNotificationCount();
      }, 100);
    };
    initialize();
  }, []);

  const loadVisitedNotifications = async () => {
    try {
      const visited = await AsyncStorage.getItem("visitedNotifications");
      if (visited) {
        setVisitedNotifications(new Set(JSON.parse(visited)));
      }
    } catch (error) {
      console.error("Error loading visited notifications:", error);
    }
  };

  const saveVisitedNotifications = async (visitedSet) => {
    try {
      await AsyncStorage.setItem("visitedNotifications", JSON.stringify(Array.from(visitedSet)));
    } catch (error) {
      console.error("Error saving visited notifications:", error);
    }
  };

  const markNotificationsAsVisited = async (notificationIds) => {
    const newVisited = new Set([...visitedNotifications, ...notificationIds]);
    setVisitedNotifications(newVisited);
    await saveVisitedNotifications(newVisited);
    // Update count with new visited set
    await fetchNotificationCount(newVisited);
  };

  const fetchNotificationCount = async (visitedSet = null) => {
    try {
      // Use provided visitedSet or current state
      const visited = visitedSet || visitedNotifications;
      
      // Fetch user's posts
      const booksResponse = await fetch(`${API_URL}/books/user`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!booksResponse.ok) return;

      const booksData = await booksResponse.json();
      const userBooks = booksData.books || [];

      let unvisitedCount = 0;

      for (const book of userBooks) {
        // Fetch likes for this book
        try {
          const likesResponse = await fetch(`${API_URL}/likes/${book._id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (likesResponse.ok) {
            const likesData = await likesResponse.json();
            const likes = likesData.likes || [];
            // Count unvisited likes from other users
            likes.forEach((like) => {
              if (like.user?._id !== user?._id) {
                const notificationId = `like_${like._id}`;
                if (!visited.has(notificationId)) {
                  unvisitedCount++;
                }
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
            // Count unvisited comments from other users (excluding replies)
            comments.forEach((comment) => {
              if (comment.user?._id !== user?._id && !comment.parentComment) {
                const notificationId = `comment_${comment._id}`;
                if (!visited.has(notificationId)) {
                  unvisitedCount++;
                }
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
              const notificationId = `friend_request_${request._id}`;
              if (!visited.has(notificationId)) {
                unvisitedCount++;
              }
            }
          });
        }
      } catch (error) {
        console.error("Error fetching friend requests:", error);
      }

      setNotificationCount(unvisitedCount);
    } catch (error) {
      console.error("Error fetching notification count:", error);
    }
  };

  const handleLoadMore = async () => {
    if (hasMore && !loading && !refreshing) {
      await fetchBooks(page + 1);
    }
  };

  const handleLike = async (bookId) => {
    if (likingBookId === bookId) return; // Prevent double clicks
    
    setLikingBookId(bookId);
    try {
      const response = await fetch(`${API_URL}/likes/${bookId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to toggle like");

      const data = await response.json();

      // Update the book in the list
      setBooks((prevBooks) =>
        prevBooks.map((book) => {
          if (book._id === bookId) {
            return {
              ...book,
              isLiked: data.liked,
              likesCount: data.liked
                ? (book.likesCount || 0) + 1
                : Math.max((book.likesCount || 0) - 1, 0),
            };
          }
          return book;
        })
      );
      
      // Refresh notification count after like action
      fetchNotificationCount();
    } catch (error) {
      console.error("Error toggling like:", error);
    } finally {
      setLikingBookId(null);
    }
  };

  const handleOpenComments = (bookId) => {
    setSelectedBookId(bookId);
    setCommentModalVisible(true);
  };

  const handleOpenLikes = (bookId) => {
    setSelectedBookId(bookId);
    setLikesModalVisible(true);
  };

  const handleCommentAdded = (increment = true) => {
    // Update comment count (increment or decrement)
    if (selectedBookId) {
      setBooks((prevBooks) =>
        prevBooks.map((book) => {
          if (book._id === selectedBookId) {
            return {
              ...book,
              commentsCount: Math.max(
                (book.commentsCount || 0) + (increment ? 1 : -1),
                0
              ),
            };
          }
          return book;
        })
      );
      // Refresh notification count after comment action
      fetchNotificationCount();
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.bookCard}>
      <View style={styles.bookHeader}>
        <TouchableOpacity
          style={styles.userInfo}
          onPress={() => handleUserProfilePress(item.user._id)}
          activeOpacity={0.7}
        >
          <Image source={{ uri: item.user.profileImg }} style={styles.avatar} />
          <Text style={styles.username}>{item.user.username}</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.bookTitle}>{item.title}</Text>
      <Text style={styles.caption}>{item.caption}</Text>
      <View style={styles.bookImageContainer}>
        <Image source={item.image} style={styles.bookImage} contentFit="cover" />
      </View>

      <View style={styles.bookDetails}>
        <View style={styles.ratingAndActions}>
          <View style={styles.ratingContainer}>{renderRatingStars(item.rating)}</View>
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleLike(item._id)}
              disabled={likingBookId === item._id}
            >
              <Ionicons
                name={item.isLiked ? "heart" : "heart-outline"}
                size={20}
                color={item.isLiked ? "#e74c3c" : COLORS.textSecondary}
              />
              {item.likesCount > 0 && (
                <TouchableOpacity
                  onPress={() => handleOpenLikes(item._id)}
                  style={styles.countButton}
                >
                  <Text style={styles.countText}>{item.likesCount}</Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleOpenComments(item._id)}
            >
              <Ionicons
                name="chatbubble-outline"
                size={20}
                color={COLORS.textSecondary}
              />
              {item.commentsCount > 0 && (
                <Text style={styles.countText}>{item.commentsCount}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.date}>Shared on {formatPublishDate(item.createdAt)}</Text>
      </View>
    </View>
  );

  const renderRatingStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i <= rating ? "star" : "star-outline"}
          size={16}
          color={i <= rating ? "#f4b400" : COLORS.textSecondary}
          style={{ marginRight: 2 }}
        />
      );
    }
    return stars;
  };

  if (loading) return <Loader />;

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={books}
        renderItem={renderItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        onScrollToIndexFailed={(info) => {
          // Fallback if scrollToIndex fails
          const wait = new Promise((resolve) => setTimeout(resolve, 500));
          wait.then(() => {
            flatListRef.current?.scrollToIndex({
              index: info.index,
              animated: true,
            });
          });
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              fetchBooks(1, true);
              fetchNotificationCount();
            }}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.1}
        ListHeaderComponent={
          <View>
            <View style={styles.headerTop}>
              <View style={styles.header}>
                <View style={styles.headerSpacer} />
                <View style={styles.headerTitleContainer}>
                  <Text style={styles.headerTitle}>Your Meme's</Text>
                </View>
                <TouchableOpacity
                  style={styles.notificationButton}
                  onPress={async () => {
                    setNotificationModalVisible(true);
                    // Mark all current notifications as visited when opening modal
                    await fetchNotificationCount();
                  }}
                >
                  <Ionicons name="notifications" size={26} color={COLORS.primary} />
                  {notificationCount > 0 && (
                    <View style={styles.notificationBadge}>
                      <Text style={styles.notificationBadgeText}>
                        {notificationCount > 99 ? "99+" : notificationCount}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
              <Text style={styles.headerSubtitle}>Freshest memes served daily. Scroll and LOL! 😂🔥</Text>
            </View>
          </View>
        }
        ListFooterComponent={
          hasMore && books.length > 0 ? (
            <ActivityIndicator style={styles.footerLoader} size="small" color={COLORS.primary} />
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="book-outline" size={60} color={COLORS.textSecondary} />
            <Text style={styles.emptyText}>No recommendations yet</Text>
            <Text style={styles.emptySubtext}>Be the first to share a meme!</Text>
          </View>
        }
      />
      <CommentModal
        visible={commentModalVisible}
        onClose={() => {
          setCommentModalVisible(false);
          setSelectedBookId(null);
        }}
        bookId={selectedBookId}
        onCommentAdded={handleCommentAdded}
      />
      <LikesModal
        visible={likesModalVisible}
        onClose={() => {
          setLikesModalVisible(false);
          setSelectedBookId(null);
        }}
        bookId={selectedBookId}
      />
      <NotificationModal
        visible={notificationModalVisible}
        onClose={async () => {
          setNotificationModalVisible(false);
          await fetchNotificationCount();
        }}
        onNotificationClick={async (bookId, notificationId) => {
          // Mark notification as visited
          const newVisited = new Set([...visitedNotifications, notificationId]);
          setVisitedNotifications(newVisited);
          await saveVisitedNotifications(newVisited);
          
          // Close modal
          setNotificationModalVisible(false);
          
          // Find and scroll to the post
          const postIndex = books.findIndex((book) => book._id === bookId);
          if (postIndex !== -1 && flatListRef.current) {
            setTimeout(() => {
              try {
                flatListRef.current?.scrollToIndex({
                  index: postIndex,
                  animated: true,
                  viewPosition: 0.1,
                });
              } catch (error) {
                // If scrollToIndex fails, try scrollToOffset as fallback
                console.log("Scroll to index failed, using offset");
                flatListRef.current?.scrollToOffset({
                  offset: postIndex * 300, // Approximate offset
                  animated: true,
                });
              }
            }, 300);
          }
          
          // Refresh notification count with updated visited set
          await fetchNotificationCount(newVisited);
        }}
        onModalOpen={async () => {
          // Mark all notifications as visited when modal opens
          const allNotificationIds = [];
          try {
            const booksResponse = await fetch(`${API_URL}/books/user`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (booksResponse.ok) {
              const booksData = await booksResponse.json();
              const userBooks = booksData.books || [];
              
              for (const book of userBooks) {
                // Get likes
                try {
                  const likesResponse = await fetch(`${API_URL}/likes/${book._id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                  });
                  if (likesResponse.ok) {
                    const likesData = await likesResponse.json();
                    const likes = likesData.likes || [];
                    likes.forEach((like) => {
                      if (like.user?._id !== user?._id) {
                        allNotificationIds.push(`like_${like._id}`);
                      }
                    });
                  }
                } catch (error) {
                  console.error("Error:", error);
                }
                
                // Get comments
                try {
                  const commentsResponse = await fetch(`${API_URL}/comments/${book._id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                  });
                  if (commentsResponse.ok) {
                    const commentsData = await commentsResponse.json();
                    const comments = commentsData.comments || [];
                    comments.forEach((comment) => {
                      if (comment.user?._id !== user?._id && !comment.parentComment) {
                        allNotificationIds.push(`comment_${comment._id}`);
                      }
                    });
                  }
                } catch (error) {
                  console.error("Error:", error);
                }
              }
              
              // Get friend requests
              try {
                const friendRequestsResponse = await fetch(`${API_URL}/friends/requests/received`, {
                  headers: { Authorization: `Bearer ${token}` },
                });
                if (friendRequestsResponse.ok) {
                  const friendRequestsData = await friendRequestsResponse.json();
                  const friendRequests = friendRequestsData.requests || friendRequestsData || [];
                  friendRequests.forEach((request) => {
                    if (request.sender && request.sender._id !== user?._id) {
                      allNotificationIds.push(`friend_request_${request._id}`);
                    }
                  });
                }
              } catch (error) {
                console.error("Error fetching friend requests:", error);
              }
              
              await markNotificationsAsVisited(allNotificationIds);
              await fetchNotificationCount();
            }
          } catch (error) {
            console.error("Error marking notifications as visited:", error);
          }
        }}
      />
    </View>
  );
}