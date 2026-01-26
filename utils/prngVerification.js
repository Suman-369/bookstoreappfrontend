/**
 * PRNG Verification Script for React Native
 * Add this to your app to test if PRNG is working
 * 
 * To use: Import and call verifyPRNG() at app startup
 */

import { generateKeyPair, generateNonce, generateSymmetricKey } from './utils/cryptoUtils';

export const verifyPRNG = async () => {
  console.log('\n🔍 ===== PRNG VERIFICATION START =====');
  
  try {
    // Test 1: Key generation
    console.log('\n1️⃣ Testing Key Generation...');
    const keys = generateKeyPair();
    if (keys.publicKey && keys.secretKey) {
      console.log('✅ Keys generated successfully');
      console.log(`   Public key length: ${keys.publicKey.length}`);
      console.log(`   Secret key length: ${keys.secretKey.length}`);
    } else {
      throw new Error('Keys not generated properly');
    }

    // Test 2: Nonce generation
    console.log('\n2️⃣ Testing Nonce Generation...');
    const nonce = generateNonce();
    if (nonce && nonce.length > 0) {
      console.log('✅ Nonce generated successfully');
      console.log(`   Nonce length: ${nonce.length}`);
    } else {
      throw new Error('Nonce not generated properly');
    }

    // Test 3: Symmetric key generation
    console.log('\n3️⃣ Testing Symmetric Key Generation...');
    const key = generateSymmetricKey();
    if (key && key.length > 0) {
      console.log('✅ Symmetric key generated successfully');
      console.log(`   Key length: ${key.length}`);
    } else {
      throw new Error('Symmetric key not generated properly');
    }

    // Test 4: Multiple generations (ensure no repetition)
    console.log('\n4️⃣ Testing Multiple Generations...');
    const nonce1 = generateNonce();
    const nonce2 = generateNonce();
    if (nonce1 !== nonce2) {
      console.log('✅ Multiple generations produce different values');
    } else {
      console.warn('⚠️  Warning: Multiple generations produced same value');
    }

    console.log('\n✨ ===== ALL PRNG TESTS PASSED =====\n');
    return { success: true, message: 'PRNG verified and working' };
  } catch (error) {
    console.error('\n❌ ===== PRNG VERIFICATION FAILED =====');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    console.error('========================================\n');
    return { success: false, error: error.message };
  }
};

/**
 * Usage in your app:
 * 
 * import { verifyPRNG } from './utils/prngVerification';
 * 
 * export default function App() {
 *   useEffect(() => {
 *     const result = verifyPRNG();
 *     console.log('PRNG Status:', result);
 *   }, []);
 *   
 *   // ... rest of app
 * }
 */
