import React, { useState, useEffect, useRef } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useAuthStore } from "../store/authStore";
import { API_URL } from "../constants/api";
import COLORS from "../constants/colors";
import { formatPublishDate } from "../utils/dateUtils";
import styles from "../assets/styles/commentModal.styles";

export default function CommentModal({ visible, onClose, bookId, onCommentAdded }) {
  const { token, user } = useAuthStore();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [expandedReplies, setExpandedReplies] = useState({});
  const inputRef = useRef(null);

  useEffect(() => {
    if (visible && bookId) {
      fetchComments();
    }
  }, [visible, bookId]);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/comments/${bookId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch comments");

      const data = await response.json();
      setComments(data.comments || []);
    } catch (error) {
      console.error("Error fetching comments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async (parentCommentId = null) => {
    if (!commentText.trim()) return;

    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/comments/${bookId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: commentText.trim(),
          parentCommentId: parentCommentId || undefined,
        }),
      });

      if (!response.ok) throw new Error("Failed to add comment");

      setCommentText("");
      setReplyingTo(null);
      
      // If it's a reply, expand the replies section
      if (parentCommentId) {
        setExpandedReplies(prev => ({ ...prev, [parentCommentId]: true }));
      }

      await fetchComments();
      // Only notify for top-level comments (not replies)
      if (onCommentAdded && !parentCommentId) {
        onCommentAdded(true);
      }
    } catch (error) {
      console.error("Error adding comment:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReplyClick = (commentId) => {
    setReplyingTo(commentId);
    // Focus the input after a short delay to ensure it's rendered
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
    setCommentText("");
    inputRef.current?.blur();
  };

  const toggleReplies = (commentId) => {
    setExpandedReplies(prev => ({
      ...prev,
      [commentId]: !prev[commentId]
    }));
  };

  const handleDeleteComment = async (commentId) => {
    try {
      // Check if it's a top-level comment before deleting
      const isTopLevel = comments.some(
        (comment) => comment._id === commentId && !comment.parentComment
      );

      const response = await fetch(`${API_URL}/comments/${commentId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to delete comment");

      await fetchComments();
      // Only decrement count for top-level comments
      if (onCommentAdded && isTopLevel) {
        onCommentAdded(false); // false means decrement
      }
    } catch (error) {
      console.error("Error deleting comment:", error);
    }
  };

  const renderComment = ({ item }) => (
    <View style={styles.commentItem}>
      <Image
        source={{ uri: item.user?.profileImg || "https://via.placeholder.com/40" }}
        style={styles.commentAvatar}
      />
      <View style={styles.commentContent}>
        <View style={styles.commentHeader}>
          <Text style={styles.commentUsername}>{item.user?.username || "User"}</Text>
          <Text style={styles.commentDate}>{formatPublishDate(item.createdAt)}</Text>
        </View>
        <Text style={styles.commentText}>{item.text}</Text>
        <View style={styles.commentActions}>
          <TouchableOpacity
            onPress={() => handleReplyClick(item._id)}
            style={styles.replyButton}
          >
            <Ionicons name="chatbubble-outline" size={14} color={COLORS.primary} />
            <Text style={styles.replyText}>Reply</Text>
          </TouchableOpacity>
          {item.user?._id === user?._id && (
            <TouchableOpacity
              onPress={() => handleDeleteComment(item._id)}
              style={styles.deleteButton}
            >
              <Ionicons name="trash-outline" size={14} color="#e74c3c" />
            </TouchableOpacity>
          )}
        </View>

        {/* Reply Count and Expandable Replies */}
        {item.replies && item.replies.length > 0 && (
          <View style={styles.repliesSection}>
            <TouchableOpacity
              onPress={() => toggleReplies(item._id)}
              style={styles.replyCountButton}
            >
              <View style={styles.replyCountLine} />
              <Text style={styles.replyCountText}>
                {expandedReplies[item._id] ? "Hide" : "View"} {item.replies.length} {item.replies.length === 1 ? "reply" : "replies"}
              </Text>
            </TouchableOpacity>
            
            {expandedReplies[item._id] && (
              <View style={styles.repliesContainer}>
                {item.replies.map((reply) => (
                  <View key={reply._id} style={styles.replyItem}>
                    <Image
                      source={{ uri: reply.user?.profileImg || "https://via.placeholder.com/32" }}
                      style={styles.replyAvatar}
                    />
                    <View style={styles.replyContent}>
                      <View style={styles.commentHeader}>
                        <Text style={styles.commentUsername}>{reply.user?.username || "User"}</Text>
                        <Text style={styles.commentDate}>{formatPublishDate(reply.createdAt)}</Text>
                      </View>
                      <Text style={styles.commentText}>{reply.text}</Text>
                      {reply.user?._id === user?._id && (
                        <TouchableOpacity
                          onPress={() => handleDeleteComment(reply._id)}
                          style={styles.deleteButton}
                        >
                          <Ionicons name="trash-outline" size={12} color="#e74c3c" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
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
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Comments</Text>
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
            data={comments}
            renderItem={renderComment}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.commentsList}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="chatbubbles-outline" size={48} color={COLORS.textSecondary} />
                <Text style={styles.emptyText}>No comments yet</Text>
                <Text style={styles.emptySubtext}>Be the first to comment!</Text>
              </View>
            }
          />
        )}

        <View style={styles.inputContainer}>
          {replyingTo && (
            <View style={styles.replyingToIndicator}>
              <TouchableOpacity
                onPress={handleCancelReply}
                style={styles.cancelReplyButton}
              >
                <Ionicons name="close-circle" size={18} color={COLORS.textSecondary} />
              </TouchableOpacity>
              <Text style={styles.replyingToText} numberOfLines={1}>
                Replying to {comments.find(c => c._id === replyingTo)?.user?.username || "user"}
              </Text>
            </View>
          )}
          <View style={styles.inputRow}>
            <Image
              source={{ uri: user?.profileImg || "https://via.placeholder.com/32" }}
              style={styles.inputAvatar}
            />
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder={replyingTo ? "Write a reply..." : "Write a comment..."}
              placeholderTextColor={COLORS.placeholderText}
              value={commentText}
              onChangeText={setCommentText}
              multiline
            />
            <TouchableOpacity
              onPress={() => handleAddComment(replyingTo || null)}
              style={[styles.sendButton, (submitting || !commentText.trim()) && styles.sendButtonDisabled]}
              disabled={submitting || !commentText.trim()}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Ionicons name="send" size={20} color={COLORS.white} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
