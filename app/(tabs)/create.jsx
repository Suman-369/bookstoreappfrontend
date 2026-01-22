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
import * as FileSystem from "expo-file-system";
import { API_URL } from "../../constants/api";

export default function Create() {
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [rating, setRating] = useState(3);
  const [image, setImage] = useState(null); // to display the selected image
  const [imageBase64, setImageBase64] = useState(null);
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const { token, logout } = useAuthStore();


  const pickImage = async () => {
    try {
      // request permission if needed
      if (Platform.OS !== "web") {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (status !== "granted") {
          Alert.alert("Permission Denied", "We need camera roll permissions to upload an image");
          return;
        }
      }

      // launch image library with optimized settings
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.3, // reduced quality for smaller file size
        base64: true,
        exif: false, // disable EXIF data to reduce size
      });

      if (!result.canceled) {
        const asset = result.assets[0];
        setImage(asset.uri);

        let base64Data = null;

        // if base64 is provided, use it
        if (asset.base64) {
          base64Data = asset.base64;
        } else {
          // otherwise, convert to base64
          base64Data = await FileSystem.readAsStringAsync(asset.uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
        }

        // Calculate approximate size (base64 is ~33% larger than binary)
        const base64SizeMB = (base64Data.length * 3) / 4 / 1024 / 1024;
        const maxSizeMB = 50;

        if (base64SizeMB > maxSizeMB) {
          Alert.alert(
            "Image Too Large",
            `Image size is ${base64SizeMB.toFixed(2)}MB. Maximum allowed is ${maxSizeMB}MB. Please select a smaller image.`
          );
          return;
        }

        setImageBase64(base64Data);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "There was a problem selecting your image");
    }
  };

  const handleSubmit = async () => {
    if (!title || !caption || !imageBase64 || !rating) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (!token) {
      Alert.alert("Error", "You must be logged in to create a post. Please log in and try again.");
      router.push("/(auth)");
      return;
    }

    try {
      setLoading(true);

      // Validate payload size before sending (50MB limit)
      const payloadSize = JSON.stringify({
        title,
        caption,
        rating: rating.toString(),
        image: `data:image/jpeg;base64,${imageBase64}`,
      }).length;
      const payloadSizeMB = payloadSize / 1024 / 1024;

      if (payloadSizeMB > 50) {
        Alert.alert(
          "Payload Too Large",
          `Total payload size is ${payloadSizeMB.toFixed(2)}MB. Maximum allowed is 50MB. Please use a smaller image.`
        );
        setLoading(false);
        return;
      }

      // get file extension from URI or default to jpeg
      const uriParts = image.split(".");
      const fileType = uriParts[uriParts.length - 1];
      const imageType = fileType ? `image/${fileType.toLowerCase()}` : "image/jpeg";

      const imageDataUrl = `data:${imageType};base64,${imageBase64}`;

      const response = await fetch(`${API_URL}/books/create`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          caption,
          rating: rating.toString(),
          image: imageDataUrl,
        }),
      });

      // Check if response is ok before parsing JSON
      if (!response.ok) {
        const text = await response.text();
        let errorMessage = "Something went wrong";
        try {
          const errorData = JSON.parse(text);
          errorMessage = errorData.message || errorMessage;
        } catch {
          errorMessage = text || `Server error: ${response.status}`;
        }
        
        // If unauthorized, clear token and redirect to login
        if (response.status === 401) {
          await logout();
          Alert.alert("Session Expired", "Please log in again to continue.");
          router.replace("/(auth)");
          return;
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();

      Alert.alert("Success", "Your book recommendation has been posted!");
      setTitle("");
      setCaption("");
      setRating(3);
      setImage(null);
      setImageBase64(null);
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
            <Text style={styles.title}>Add Book Recommendation</Text>
            <Text style={styles.subtitle}>Share your favorite reads with others</Text>
          </View>

          <View style={styles.form}>
            {/* BOOK TITLE */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Book Title</Text>
              <View style={styles.inputContainer}>
                <Ionicons
                  name="book-outline"
                  size={20}
                  color={COLORS.textSecondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Enter book title"
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

            {/* IMAGE */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Book Image</Text>
              <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
                {image ? (
                  <Image source={{ uri: image }} style={styles.previewImage} />
                ) : (
                  <View style={styles.placeholderContainer}>
                    <Ionicons name="image-outline" size={40} color={COLORS.textSecondary} />
                    <Text style={styles.placeholderText}>Tap to select image</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* CAPTION */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Caption</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Write your review or thoughts about this book..."
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