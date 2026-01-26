import "react-native-get-random-values";

// CRITICAL: Initialize PRNG BEFORE importing nacl
if (!global.crypto || !global.crypto.getRandomValues) {
  throw new Error(
    "crypto.getRandomValues not available - react-native-get-random-values not working",
  );
}

import nacl from "tweetnacl";
import base64 from "base64-js";

// CRITICAL: Initialize PRNG immediately after imports
nacl.random = global.crypto.getRandomValues;

/**
 * End-to-End Encryption Utilities for React Native
 * Uses TweetNaCl.js (libsodium) with Curve25519 + ChaCha20-Poly1305
 *
 * CRITICAL: TweetNaCl requires nacl.random to be initialized
 * This is the root cause of "Error: no PRNG"
 * SOLUTION: Use crypto.getRandomValues from react-native-get-random-values
 */

/**
 * Initialize PRNG using crypto.getRandomValues from react-native-get-random-values
 * This provides cryptographically secure random bytes for TweetNaCl
 */
const initPRNG = () => {
  // Assign global crypto.getRandomValues to nacl.random
  nacl.random = global.crypto.getRandomValues;
};

// Initialize PRNG immediately on module load
initPRNG();

// Convert between base64 and Uint8Array
export const base64ToUint8Array = (base64String) => {
  return new Uint8Array(base64.toByteArray(base64String));
};

export const uint8ArrayToBase64 = (uint8Array) => {
  return base64.fromByteArray(uint8Array);
};

/**
 * Generate a keypair for the user
 * Uses crypto.getRandomValues from react-native-get-random-values for secure PRNG
 */
export const generateKeyPair = () => {
  try {
    // Ensure PRNG is initialized
    if (!nacl.random || typeof nacl.random !== "function") {
      initPRNG();
    }

    const keyPair = nacl.box.keyPair();
    return {
      publicKey: uint8ArrayToBase64(keyPair.publicKey),
      secretKey: uint8ArrayToBase64(keyPair.secretKey),
    };
  } catch (error) {
    console.error("❌ Key generation error:", error);
    console.error("Error message:", error.message);
    console.error("Error type:", error.constructor.name);
    throw new Error(`Failed to generate keypair: ${error.message}`);
  }
};

/**
 * Generate a random nonce
 */
export const generateNonce = () => {
  try {
    // Ensure PRNG is initialized
    if (!nacl.random || typeof nacl.random !== "function") {
      initPRNG();
    }

    const nonce = nacl.randomBytes(nacl.box.nonceLength);
    return uint8ArrayToBase64(nonce);
  } catch (error) {
    throw new Error(`Failed to generate nonce: ${error.message}`);
  }
};

/**
 * Generate a random symmetric key (256-bit)
 */
export const generateSymmetricKey = () => {
  try {
    // Ensure PRNG is initialized
    if (!nacl.random || typeof nacl.random !== "function") {
      initPRNG();
    }

    const key = nacl.randomBytes(32); // 256-bit key
    return uint8ArrayToBase64(key);
  } catch (error) {
    console.error("❌ Symmetric key generation error:", error);
    throw new Error(`Failed to generate symmetric key: ${error.message}`);
  }
};

/**
 * Encrypt a message with a symmetric key
 * Uses ChaCha20-Poly1305 (authenticated encryption)
 */
export const encryptMessage = (message, symmetricKeyBase64, nonceBase64) => {
  try {
    const messageUint8 = new TextEncoder().encode(message);
    const symmetricKey = base64ToUint8Array(symmetricKeyBase64);
    const nonce = base64ToUint8Array(nonceBase64);

    // Use nacl.secretbox for symmetric encryption
    const encrypted = nacl.secretbox(messageUint8, nonce, symmetricKey);

    return {
      ciphertext: uint8ArrayToBase64(encrypted),
      nonce: nonceBase64,
    };
  } catch (error) {
    throw new Error("Failed to encrypt message");
  }
};

/**
 * Decrypt a message with a symmetric key
 */
export const decryptMessage = (ciphertext, symmetricKeyBase64, nonceBase64) => {
  try {
    const ciphertextUint8 = base64ToUint8Array(ciphertext);
    const symmetricKey = base64ToUint8Array(symmetricKeyBase64);
    const nonce = base64ToUint8Array(nonceBase64);

    const decrypted = nacl.secretbox.open(ciphertextUint8, nonce, symmetricKey);

    if (!decrypted) {
      throw new Error("Decryption failed - authentication failed");
    }

    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error("Message decryption error:", error);
    throw new Error("Failed to decrypt message");
  }
};

/**
 * Encrypt the symmetric key with recipient's public key
 * Uses Curve25519 + ChaCha20-Poly1305
 */
export const encryptSymmetricKey = (
  symmetricKeyBase64,
  recipientPublicKeyBase64,
  senderSecretKeyBase64,
  nonceBase64,
) => {
  try {
    const symmetricKey = base64ToUint8Array(symmetricKeyBase64);
    const recipientPublicKey = base64ToUint8Array(recipientPublicKeyBase64);
    const senderSecretKey = base64ToUint8Array(senderSecretKeyBase64);
    const nonce = base64ToUint8Array(nonceBase64);

    // Use nacl.box for asymmetric encryption
    const encryptedKey = nacl.box(
      symmetricKey,
      nonce,
      recipientPublicKey,
      senderSecretKey,
    );

    return uint8ArrayToBase64(encryptedKey);
  } catch (error) {
    console.error("Key encryption error:", error);
    throw new Error("Failed to encrypt symmetric key");
  }
};

/**
 * Decrypt the symmetric key with recipient's secret key
 */
export const decryptSymmetricKey = (
  encryptedKeyBase64,
  senderPublicKeyBase64,
  recipientSecretKeyBase64,
  nonceBase64,
) => {
  try {
    const encryptedKey = base64ToUint8Array(encryptedKeyBase64);
    const senderPublicKey = base64ToUint8Array(senderPublicKeyBase64);
    const recipientSecretKey = base64ToUint8Array(recipientSecretKeyBase64);
    const nonce = base64ToUint8Array(nonceBase64);

    const decrypted = nacl.box.open(
      encryptedKey,
      nonce,
      senderPublicKey,
      recipientSecretKey,
    );

    if (!decrypted) {
      throw new Error("Key decryption failed - authentication failed");
    }

    return uint8ArrayToBase64(decrypted);
  } catch (error) {
    console.error("Key decryption error:", error);
    throw new Error("Failed to decrypt symmetric key");
  }
};

/**
 * Complete end-to-end encryption flow for a message
 * Returns: { encryptedMessage, encryptedSymmetricKey, nonce }
 */
export const encryptMessageE2EE = (
  message,
  recipientPublicKeyBase64,
  senderSecretKeyBase64,
) => {
  try {
    // Generate fresh symmetric key and nonce for this message
    const symmetricKey = generateSymmetricKey();
    const nonce = generateNonce();

    // Encrypt the message with symmetric key
    const { ciphertext } = encryptMessage(message, symmetricKey, nonce);

    // Encrypt the symmetric key with recipient's public key
    const encryptedSymmetricKey = encryptSymmetricKey(
      symmetricKey,
      recipientPublicKeyBase64,
      senderSecretKeyBase64,
      nonce,
    );

    return {
      encryptedMessage: ciphertext,
      encryptedSymmetricKey,
      nonce,
    };
  } catch (error) {
    console.error("E2EE encryption error:", error);
    throw error;
  }
};

/**
 * Complete end-to-end decryption flow for a message
 * Returns: decrypted message text
 */
export const decryptMessageE2EE = (
  encryptedMessage,
  encryptedSymmetricKey,
  nonce,
  senderPublicKeyBase64,
  recipientSecretKeyBase64,
) => {
  try {
    // Decrypt the symmetric key using recipient's secret key
    const symmetricKey = decryptSymmetricKey(
      encryptedSymmetricKey,
      senderPublicKeyBase64,
      recipientSecretKeyBase64,
      nonce,
    );

    // Decrypt the message using the symmetric key
    const message = decryptMessage(encryptedMessage, symmetricKey, nonce);

    return message;
  } catch (error) {
    console.error("E2EE decryption error:", error);
    throw error;
  }
};

/**
 * Sign a message with sender's secret key
 * Returns: signature as base64
 */
export const signMessage = (message, secretKeyBase64) => {
  try {
    const messageUint8 = new TextEncoder().encode(message);
    const secretKey = base64ToUint8Array(secretKeyBase64);
    const signature = nacl.sign.detached(messageUint8, secretKey);
    return uint8ArrayToBase64(signature);
  } catch (error) {
    console.error("Message signing error:", error);
    throw new Error("Failed to sign message");
  }
};

/**
 * Verify a message signature
 */
export const verifySignature = (message, signatureBase64, publicKeyBase64) => {
  try {
    const messageUint8 = new TextEncoder().encode(message);
    const signature = base64ToUint8Array(signatureBase64);
    const publicKey = base64ToUint8Array(publicKeyBase64);
    return nacl.sign.detached.verify(messageUint8, signature, publicKey);
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
};
