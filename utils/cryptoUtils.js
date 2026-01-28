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

/**
 * Validate a keypair - check format and length
 * Returns: { valid: boolean, error?: string }
 */
export const validateKeyPair = (publicKey, secretKey) => {
  try {
    if (!publicKey || !secretKey) {
      return { valid: false, error: "Missing publicKey or secretKey" };
    }

    const pubUint8 = base64ToUint8Array(publicKey);
    const secUint8 = base64ToUint8Array(secretKey);

    if (pubUint8.length !== nacl.box.publicKeyLength) {
      return {
        valid: false,
        error: `Invalid publicKey length: ${pubUint8.length}, expected ${nacl.box.publicKeyLength}`,
      };
    }

    if (secUint8.length !== nacl.box.secretKeyLength) {
      return {
        valid: false,
        error: `Invalid secretKey length: ${secUint8.length}, expected ${nacl.box.secretKeyLength}`,
      };
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, error: error.message };
  }
};

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
 * Encrypt a message using nacl.box (asymmetric encryption)
 * Returns: { cipherText, nonce }
 */
export const encryptMessage = (text, senderPrivateKey, receiverPublicKey) => {
  try {
    if (!text || !senderPrivateKey || !receiverPublicKey) {
      throw new Error("Missing encryption parameters");
    }

    const messageUint8 = new TextEncoder().encode(text);
    const receiverPublicKeyUint8 = base64ToUint8Array(receiverPublicKey);
    const senderPrivateKeyUint8 = base64ToUint8Array(senderPrivateKey);
    const nonce = nacl.randomBytes(nacl.box.nonceLength);

    // Validate key lengths
    if (receiverPublicKeyUint8.length !== nacl.box.publicKeyLength) {
      throw new Error(
        `Invalid receiver public key length: ${receiverPublicKeyUint8.length}, expected ${nacl.box.publicKeyLength}`,
      );
    }
    if (senderPrivateKeyUint8.length !== nacl.box.secretKeyLength) {
      throw new Error(
        `Invalid sender private key length: ${senderPrivateKeyUint8.length}, expected ${nacl.box.secretKeyLength}`,
      );
    }

    // Encrypt message directly using nacl.box
    const cipherText = nacl.box(
      messageUint8,
      nonce,
      receiverPublicKeyUint8,
      senderPrivateKeyUint8,
    );

    if (!cipherText) {
      throw new Error("Message encryption failed");
    }

    return {
      cipherText: uint8ArrayToBase64(cipherText),
      nonce: uint8ArrayToBase64(nonce),
    };
  } catch (error) {
    console.error("❌ Message encryption error:", error.message || error);
    throw error;
  }
};

/**
 * Decrypt a message using nacl.box.open (asymmetric decryption)
 * Returns: decrypted message text or null if decryption fails
 */
export const decryptMessage = (msg, receiverPrivateKey) => {
  try {
    if (!msg || !receiverPrivateKey) {
      console.warn("❌ Decryption failed - missing msg or receiverPrivateKey");
      return null;
    }

    const { cipherText, nonce, senderPublicKey } = msg;
    if (!cipherText || !nonce || !senderPublicKey) {
      console.warn(
        "❌ Decryption failed - missing cipherText, nonce, or senderPublicKey",
      );
      return null;
    }

    const cipherTextUint8 = base64ToUint8Array(cipherText);
    const nonceUint8 = base64ToUint8Array(nonce);
    const senderPublicKeyUint8 = base64ToUint8Array(senderPublicKey);
    const receiverPrivateKeyUint8 = base64ToUint8Array(receiverPrivateKey);

    // Validate key and nonce lengths
    if (senderPublicKeyUint8.length !== nacl.box.publicKeyLength) {
      console.warn(
        `❌ Invalid sender public key length: ${senderPublicKeyUint8.length}, expected ${nacl.box.publicKeyLength}`,
      );
      return null;
    }
    if (receiverPrivateKeyUint8.length !== nacl.box.secretKeyLength) {
      console.warn(
        `❌ Invalid receiver private key length: ${receiverPrivateKeyUint8.length}, expected ${nacl.box.secretKeyLength}`,
      );
      return null;
    }
    if (nonceUint8.length !== nacl.box.nonceLength) {
      console.warn(
        `❌ Invalid nonce length: ${nonceUint8.length}, expected ${nacl.box.nonceLength}`,
      );
      return null;
    }

    // Decrypt message using nacl.box.open
    const decrypted = nacl.box.open(
      cipherTextUint8,
      nonceUint8,
      senderPublicKeyUint8,
      receiverPrivateKeyUint8,
    );

    if (!decrypted) {
      // Silently fail for better UX - don't spam console
      return null;
    }

    const decryptedText = new TextDecoder().decode(decrypted);

    if (!decryptedText || decryptedText.trim().length === 0) {
      console.warn("❌ Decrypted message is empty");
      return null;
    }

    return decryptedText;
  } catch (error) {
    // Silently handle decryption errors to prevent console spam
    return null;
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

/**
 * Encrypt binary data using nacl.box (asymmetric encryption)
 * Returns: { cipherText, nonce }
 */
export const encryptBinaryData = (binaryData, senderPrivateKey, receiverPublicKey) => {
  try {
    if (!binaryData || !senderPrivateKey || !receiverPublicKey) {
      throw new Error("Missing encryption parameters");
    }

    // Convert binary data to Uint8Array if it's not already
    let dataUint8;
    if (binaryData instanceof Uint8Array) {
      dataUint8 = binaryData;
    } else if (binaryData instanceof ArrayBuffer) {
      dataUint8 = new Uint8Array(binaryData);
    } else if (typeof binaryData === 'string') {
      // Assume base64 encoded binary data
      dataUint8 = base64ToUint8Array(binaryData);
    } else {
      throw new Error("Unsupported binary data format");
    }

    const receiverPublicKeyUint8 = base64ToUint8Array(receiverPublicKey);
    const senderPrivateKeyUint8 = base64ToUint8Array(senderPrivateKey);
    const nonce = nacl.randomBytes(nacl.box.nonceLength);

    // Validate key lengths
    if (receiverPublicKeyUint8.length !== nacl.box.publicKeyLength) {
      throw new Error(
        `Invalid receiver public key length: ${receiverPublicKeyUint8.length}, expected ${nacl.box.publicKeyLength}`,
      );
    }
    if (senderPrivateKeyUint8.length !== nacl.box.secretKeyLength) {
      throw new Error(
        `Invalid sender private key length: ${senderPrivateKeyUint8.length}, expected ${nacl.box.secretKeyLength}`,
      );
    }

    // Encrypt binary data using nacl.box
    const cipherText = nacl.box(
      dataUint8,
      nonce,
      receiverPublicKeyUint8,
      senderPrivateKeyUint8,
    );

    if (!cipherText) {
      throw new Error("Binary data encryption failed");
    }

    return {
      cipherText: uint8ArrayToBase64(cipherText),
      nonce: uint8ArrayToBase64(nonce),
    };
  } catch (error) {
    console.error("❌ Binary data encryption error:", error.message || error);
    throw error;
  }
};

/**
 * Decrypt binary data using nacl.box.open (asymmetric decryption)
 * Returns: decrypted binary data as Uint8Array or null if decryption fails
 */
export const decryptBinaryData = (encryptedData, receiverPrivateKey) => {
  try {
    if (!encryptedData || !receiverPrivateKey) {
      console.warn("❌ Binary decryption failed - missing encryptedData or receiverPrivateKey");
      return null;
    }

    const { cipherText, nonce, senderPublicKey } = encryptedData;
    if (!cipherText || !nonce || !senderPublicKey) {
      console.warn(
        "❌ Binary decryption failed - missing cipherText, nonce, or senderPublicKey",
      );
      return null;
    }

    const cipherTextUint8 = base64ToUint8Array(cipherText);
    const nonceUint8 = base64ToUint8Array(nonce);
    const senderPublicKeyUint8 = base64ToUint8Array(senderPublicKey);
    const receiverPrivateKeyUint8 = base64ToUint8Array(receiverPrivateKey);

    // Validate key and nonce lengths
    if (senderPublicKeyUint8.length !== nacl.box.publicKeyLength) {
      console.warn(
        `❌ Invalid sender public key length: ${senderPublicKeyUint8.length}, expected ${nacl.box.publicKeyLength}`,
      );
      return null;
    }
    if (receiverPrivateKeyUint8.length !== nacl.box.secretKeyLength) {
      console.warn(
        `❌ Invalid receiver private key length: ${receiverPrivateKeyUint8.length}, expected ${nacl.box.secretKeyLength}`,
      );
      return null;
    }
    if (nonceUint8.length !== nacl.box.nonceLength) {
      console.warn(
        `❌ Invalid nonce length: ${nonceUint8.length}, expected ${nacl.box.nonceLength}`,
      );
      return null;
    }

    // Decrypt binary data using nacl.box.open
    const decrypted = nacl.box.open(
      cipherTextUint8,
      nonceUint8,
      senderPublicKeyUint8,
      receiverPrivateKeyUint8,
    );

    if (!decrypted) {
      // Silently fail for better UX - don't spam console
      return null;
    }

    return decrypted;
  } catch (error) {
    // Silently handle binary decryption errors to prevent console spam
    return null;
  }
};
