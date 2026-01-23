import React, { useState, useEffect } from "react";
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
import { formatPublishDate } from "../lib/utils";
import styles from "../assets/styles/commentModal.styles";

export default function CommentModal({ visible, onClose, bookId, onCommentAdded }) {
  const { token, user } = useAuthStore();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
    const text = parentCommentId ? replyText : commentText;
    if (!text.trim()) return;

    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/comments/${bookId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          parentCommentId: parentCommentId || undefined,
        }),
      });

      if (!response.ok) throw new Error("Failed to add comment");

      if (parentCommentId) {
        setReplyText("");
        setReplyingTo(null);
      } else {
        setCommentText("");
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
            onPress={() => setReplyingTo(replyingTo === item._id ? null : item._id)}
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

        {/* Reply Input */}
        {replyingTo === item._id && (
          <View style={styles.replyInputContainer}>
            <TextInput
              style={styles.replyInput}
              placeholder="Write a reply..."
              placeholderTextColor={COLORS.placeholderText}
              value={replyText}
              onChangeText={setReplyText}
              multiline
            />
            <View style={styles.replyActions}>
              <TouchableOpacity
                onPress={() => {
                  setReplyingTo(null);
                  setReplyText("");
                }}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleAddComment(item._id)}
                style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                disabled={submitting || !replyText.trim()}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.submitText}>Reply</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Replies */}
        {item.replies && item.replies.length > 0 && (
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
          <Image
            source={{ uri: user?.profileImg || "https://via.placeholder.com/32" }}
            style={styles.inputAvatar}
          />
          <TextInput
            style={styles.input}
            placeholder="Write a comment..."
            placeholderTextColor={COLORS.placeholderText}
            value={commentText}
            onChangeText={setCommentText}
            multiline
          />
          <TouchableOpacity
            onPress={() => handleAddComment()}
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
      </KeyboardAvoidingView>
    </Modal>
  );
}
