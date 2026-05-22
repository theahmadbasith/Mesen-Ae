/**
 * Utility functions for password hashing using Web Crypto API.
 * This avoids external dependencies like bcrypt which can cause issues in browser/Vite builds.
 */

// Generate a random salt
const generateSalt = (length = 16) => {
  const array = new Uint8Array(length);
  window.crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

// Hash a password with a specific salt
const hashWithSalt = async (password: string, salt: string) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${password}${salt}`);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
};

/**
 * Hashes a password and returns a string in the format: sha256:{salt}:{hash}
 */
export const hashPassword = async (password: string): Promise<string> => {
  const salt = generateSalt();
  const hash = await hashWithSalt(password, salt);
  return `sha256:${salt}:${hash}`;
};

/**
 * Verifies a password against a stored hash.
 * Supports the new SHA-256 format, falls back to plain text match for old/migrated accounts.
 * Note: old bcrypt hashes ($2b$...) cannot be verified client-side without bcryptjs, 
 * so users with those hashes will need to be reset or they'll fall back to plain text match if the user types the exact hash.
 */
export const verifyPassword = async (password: string, storedHash: string): Promise<boolean> => {
  if (!storedHash) return false;

  // New SHA-256 hash format
  if (storedHash.startsWith('sha256:')) {
    const parts = storedHash.split(':');
    if (parts.length === 3) {
      const [, salt, hash] = parts;
      const computedHash = await hashWithSalt(password, salt);
      return computedHash === hash;
    }
  }

  // Fallback to plain text match (e.g. for admin123 fallback setup or manually entered plain text passwords)
  return password === storedHash;
};
