import { useState } from "react";
import {
  View,
  Text,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import styles from "../../assets/styles/create.styles";
import { Ionicons } from "@expo/vector-icons";
import COLORS from "../../constants/colors";
import { useAuthStore } from "../../store/authStore";

import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { API_URL } from "../../constants/api";

const MAX_VIDEO_MB = 100;
const MAX_IMAGE_MB = 50;

function getMediaFormInfo(uri, mediaType) {
  const raw = uri.split(/[?#]/)[0];
  const ext = (raw.split(".").pop() || "").toLowerCase();
  const mimeMap = { mp4: "video/mp4", mov: "video/quicktime", m4v: "video/x-m4v", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif", webp: "image/webp" };
  const mime = mimeMap[ext] || (mediaType === "video" ? "video/mp4" : "image/jpeg");
  const name = mediaType === "video"
    ? (["mp4", "mov", "m4v"].includes(ext) ? `video.${ext}` : "video.mp4")
    : (["jpg", "jpeg", "png", "gif", "webp"].includes(ext) ? `image.${ext === "jpeg" ? "jpg" : ext}` : "image.jpg");
  return { mime, name };
}

export default function Create() {
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [rating, setRating] = useState(3);
  const [media, setMedia] = useState(null);
  const [mediaType, setMediaType] = useState(null); // 'image' | 'video'
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const { token, logout } = useAuthStore();


  const pickMedia = async () => {
    try {
      // request permission if needed
      if (Platform.OS !== "web") {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (status !== "granted") {
          Alert.alert("Permission Denied", "We need camera roll permissions to upload media");
          return;
        }
      }

      // Show action sheet to choose between image and video
      Alert.alert(
        "Select Media Type",
        "Choose what you want to upload",
        [
          {
            text: "Image",
            onPress: () => pickImage(),
          },
          {
            text: "Video",
            onPress: () => pickVideo(),
          },
          {
            text: "Cancel",
            style: "cancel",
          },
        ]
      );
    } catch (error) {
      console.error("Error picking media:", error);
      Alert.alert("Error", "There was a problem selecting media");
    }
  };

  const checkFileSize = async (uri, maxMB, label) => {
    try {
      const info = await FileSystem.getInfoAsync(uri);
      if (info.exists && !info.isDirectory && typeof info.size === "number") {
        const sizeMB = info.size / 1024 / 1024;
        if (sizeMB > maxMB) {
          Alert.alert(
            `${label} Too Large`,
            `Size is ${sizeMB.toFixed(1)}MB. Maximum ${maxMB}MB. Pick a smaller file.`
          );
          return false;
        }
      }
      return true;
    } catch {
      return true;
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        exif: false,
      });

      if (!result.canceled) {
        const asset = result.assets[0];
        const ok = await checkFileSize(asset.uri, MAX_IMAGE_MB, "Image");
        if (!ok) return;
        setMedia(asset.uri);
        setMediaType("image");
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "There was a problem selecting your image");
    }
  };

  const pickVideo = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "videos",
        allowsEditing: true,
        quality: 1,
        videoMaxDuration: 60,
      });

      if (!result.canceled) {
        const asset = result.assets[0];
        const ok = await checkFileSize(asset.uri, MAX_VIDEO_MB, "Video");
        if (!ok) return;
        setMedia(asset.uri);
        setMediaType("video");
      }
    } catch (error) {
      console.error("Error picking video:", error);
      Alert.alert("Error", "There was a problem selecting your video");
    }
  };

  const handleSubmit = async () => {
    if (!title || !caption || !media || !rating || !mediaType) {
      Alert.alert("Error", "Please fill in all fields and select media");
      return;
    }

    if (!token) {
      Alert.alert("Error", "You must be logged in to create a post. Please log in and try again.");
      router.push("/(auth)");
      return;
    }

    try {
      setLoading(true);
      const { mime, name } = getMediaFormInfo(media, mediaType);
      const form = new FormData();
      form.append("media", { uri: media, type: mime, name } );
      form.append("title", title);
      form.append("caption", caption);
      form.append("rating", String(rating));
      form.append("mediaType", mediaType);

      const response = await fetch(`${API_URL}/books/create`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });

      if (!response.ok) {
        const text = await response.text();
        let errorMessage = "Something went wrong";
        try {
          const data = JSON.parse(text);
          errorMessage = data.message || errorMessage;
        } catch {
          errorMessage = text || `Server error: ${response.status}`;
        }
        if (response.status === 401) {
          await logout();
          Alert.alert("Session Expired", "Please log in again to continue.");
          router.replace("/(auth)");
          return;
        }
        throw new Error(errorMessage);
      }

      await response.json();
      Alert.alert("Success", "Your meme recommendation has been posted!");
      setTitle("");
      setCaption("");
      setRating(3);
      setMedia(null);
      setMediaType(null);
      router.push("/");
    } catch (error) {
      console.error("Error creating post:", error);
      Alert.alert("Error", error.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const renderRatingPicker = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <TouchableOpacity key={i} onPress={() => setRating(i)} style={styles.starButton}>
          <Ionicons
            name={i <= rating ? "star" : "star-outline"}
            size={32}
            color={i <= rating ? "#f4b400" : COLORS.textSecondary}
          />
        </TouchableOpacity>
      );
    }
    return <View style={styles.ratingContainer}>{stars}</View>;
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.container} style={styles.scrollViewStyle}>
        <View style={styles.card}>
          {/* HEADER */}
          <View style={styles.header}>
            <Text style={styles.title}>Add Your Recommendation</Text>
            <Text style={styles.subtitle}>Share your favorite meme's with others</Text>
          </View>

          <View style={styles.form}>
            {/* BOOK TITLE */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Meme Title</Text>
              <View style={styles.inputContainer}>
                <Ionicons
                  name="book-outline"
                  size={20}
                  color={COLORS.textSecondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Enter meme title"
                  placeholderTextColor={COLORS.placeholderText}
                  value={title}
                  onChangeText={setTitle}
                />
              </View>
            </View>

            {/* RATING */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Your Rating</Text>
              {renderRatingPicker()}
            </View>

            {/* MEDIA (IMAGE/VIDEO) */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Meme Media</Text>
              <TouchableOpacity style={styles.imagePicker} onPress={pickMedia}>
                {media ? (
                  mediaType === "video" ? (
                    <View style={styles.previewImage}>
                      <Ionicons name="videocam" size={40} color={COLORS.primary} style={{ marginBottom: 8 }} />
                      <Text style={styles.placeholderText}>Video Selected</Text>
                      <Text style={[styles.placeholderText, { fontSize: 12, marginTop: 4 }]}>Tap to change</Text>
                    </View>
                  ) : (
                    <Image source={{ uri: media }} style={styles.previewImage} />
                  )
                ) : (
                  <View style={styles.placeholderContainer}>
                    <Ionicons name="images-outline" size={40} color={COLORS.textSecondary} />
                    <Text style={styles.placeholderText}>Tap to select image or video</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* CAPTION */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Caption</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Write your review or thoughts about this meme..."
                placeholderTextColor={COLORS.placeholderText}
                value={caption}
                onChangeText={setCaption}
                multiline
              />
            </View>

            <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
              {loading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <>
                  <Ionicons
                    name="cloud-upload-outline"
                    size={20}
                    color={COLORS.white}
                    style={styles.buttonIcon}
                  />
                  <Text style={styles.buttonText}>Share</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}