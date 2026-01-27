import { useEffect, useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuthStore } from "../store/authStore";
import { API_URL } from "../constants/api";
import {
  generateKeyPair,
  uint8ArrayToBase64,
  base64ToUint8Array,
  validateKeyPair,
} from "../utils/cryptoUtils";

const KEYS_STORAGE_KEY = "e2ee_keys";

/**
 * Hook for managing E2EE keys securely in AsyncStorage
 * Generates and stores user's keypair on first use
 */
export const useKeyStorage = () => {
  const [publicKey, setPublicKey] = useState(null);
  const [secretKey, setSecretKey] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [e2eeReady, setE2eeReady] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Function to upload public key to server
  const uploadPublicKey = useCallback(async (pubKey) => {
    const { token } = useAuthStore.getState();
    if (!pubKey || !token) return;

    try {
      const res = await fetch(`${API_URL}/users/upload-public-key`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ publicKey: pubKey }),
      });
      if (!res.ok) {
        console.warn("Failed to upload public key");
      } else {
        console.log("✅ Public key uploaded to server");
      }
    } catch (e) {
      console.error("Upload public key error:", e);
    }
  }, []);

  // Load or generate keys on component mount (RUNS ONLY ONCE)
  useEffect(() => {
    let isMounted = true;

    const initializeKeys = async () => {
      try {
        setIsLoading(true);
        setError(null);

        console.log("🔑 Initializing E2EE keys...");

        // Try to load existing keys from AsyncStorage
        const storedKeys = await AsyncStorage.getItem(KEYS_STORAGE_KEY);

        if (storedKeys) {
          const keys = JSON.parse(storedKeys);

          // CRITICAL: Validate loaded keys before using them
          const validation = validateKeyPair(keys.publicKey, keys.secretKey);
          if (!validation.valid) {
            console.warn(
              `⚠️ Stored keys are invalid: ${validation.error}. Regenerating...`,
            );
            // Keys are corrupted, regenerate them
            const newKeys = generateKeyPair();
            const keysData = {
              publicKey: newKeys.publicKey,
              secretKey: newKeys.secretKey,
              generatedAt: new Date().toISOString(),
            };
            await AsyncStorage.setItem(
              KEYS_STORAGE_KEY,
              JSON.stringify(keysData),
            );
            if (isMounted) {
              setPublicKey(newKeys.publicKey);
              setSecretKey(newKeys.secretKey);
              setIsInitialized(true);
              setE2eeReady(true);
              console.log("✅ Regenerated corrupted keypair");
            }
            // Upload new public key to server
            const { token } = useAuthStore.getState();
            if (token && newKeys.publicKey && isMounted) {
              console.log("📡 Uploading new public key to server...");
              await uploadPublicKey(newKeys.publicKey);
            }
          } else {
            // Keys are valid, use them
            if (isMounted) {
              setPublicKey(keys.publicKey);
              setSecretKey(keys.secretKey);
              setIsInitialized(true);
              setE2eeReady(true);
              console.log("✅ Loaded existing keys from storage");
            }

            // Upload public key to server immediately after loading
            const { token } = useAuthStore.getState();
            if (token && keys.publicKey && isMounted) {
              console.log("📡 Uploading existing public key to server...");
              await uploadPublicKey(keys.publicKey);
            }
          }
        } else {
          // Generate new keypair if doesn't exist (fresh install or cleared storage)
          console.log("🔄 Generating new E2EE keypair...");
          const newKeys = generateKeyPair();
          const keysData = {
            publicKey: newKeys.publicKey,
            secretKey: newKeys.secretKey,
            generatedAt: new Date().toISOString(),
          };

          // Save to AsyncStorage immediately
          await AsyncStorage.setItem(
            KEYS_STORAGE_KEY,
            JSON.stringify(keysData),
          );

          if (isMounted) {
            setPublicKey(newKeys.publicKey);
            setSecretKey(newKeys.secretKey);
            setIsInitialized(true);
            setE2eeReady(true);
            console.log("✅ Generated and saved new keypair");
          }

          // Upload new public key to server immediately
          const { token } = useAuthStore.getState();
          if (token && newKeys.publicKey && isMounted) {
            console.log("📡 Uploading new public key to server...");
            await uploadPublicKey(newKeys.publicKey);
          }
        }
      } catch (err) {
        console.error("❌ Key initialization error:", err);
        if (isMounted) {
          setError(err.message || "Failed to initialize keys");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    // Call initialization only once on mount
    initializeKeys();

    // Cleanup function to prevent state updates if component unmounts
    return () => {
      isMounted = false;
    };
  }, []); // Empty dependency array = runs only once on mount

  // Function to regenerate keys (use with caution!)
  const regenerateKeys = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const newKeys = generateKeyPair();
      const keysData = {
        publicKey: newKeys.publicKey,
        secretKey: newKeys.secretKey,
        generatedAt: new Date().toISOString(),
      };

      await AsyncStorage.setItem(KEYS_STORAGE_KEY, JSON.stringify(keysData));

      setPublicKey(newKeys.publicKey);
      setSecretKey(newKeys.secretKey);
      setE2eeReady(true);

      // Upload new public key to server
      uploadPublicKey(newKeys.publicKey);

      return newKeys;
    } catch (err) {
      console.error("Key regeneration error:", err);
      setError(err.message || "Failed to regenerate keys");
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [uploadPublicKey]);

  // Function to get keys
  const getKeys = useCallback(() => {
    if (!publicKey || !secretKey) {
      throw new Error("Keys not initialized");
    }
    return {
      publicKey,
      secretKey,
    };
  }, [publicKey, secretKey]);

  // NO NEED for additional upload effect - upload happens during initialization

  // Function to clear keys (use with extreme caution!)
  const clearKeys = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(KEYS_STORAGE_KEY);
      setPublicKey(null);
      setSecretKey(null);
      setIsInitialized(false);
      setE2eeReady(false);
    } catch (err) {
      console.error("Key clear error:", err);
      setError(err.message || "Failed to clear keys");
      throw err;
    }
  }, []);

  return {
    publicKey,
    secretKey,
    isInitialized,
    e2eeReady,
    isLoading,
    error,
    regenerateKeys,
    getKeys,
    clearKeys,
  };
};

export default useKeyStorage;
