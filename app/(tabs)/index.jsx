import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useAuthStore } from "../../store/authStore";

import { Image } from "expo-image";
import { useEffect, useState } from "react";

import styles from "../../assets/styles/home.styles";
import { API_URL } from "../../constants/api";
import { Ionicons } from "@expo/vector-icons";
import { formatPublishDate } from "../../dist/_expo/lib/utils";
import COLORS from "../../constants/colors";
import Loader from "../../components/Loader";
import CommentModal from "../../components/CommentModal";
import LikesModal from "../../components/LikesModal";

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default function Home() {
  const { token } = useAuthStore();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [likesModalVisible, setLikesModalVisible] = useState(false);
  const [selectedBookId, setSelectedBookId] = useState(null);
  const [likingBookId, setLikingBookId] = useState(null);

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
    fetchBooks();
  }, []);

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
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.bookCard}>
      <View style={styles.bookHeader}>
        <View style={styles.userInfo}>
          <Image source={{ uri: item.user.profileImg }} style={styles.avatar} />
          <Text style={styles.username}>{item.user.username}</Text>
        </View>
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
        data={books}
        renderItem={renderItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchBooks(1, true)}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.1}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Your Meme's</Text>
            <Text style={styles.headerSubtitle}>Freshest memes served daily. Scroll and LOL! 😂🔥</Text>
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
    </View>
  );
}