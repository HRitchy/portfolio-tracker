/**
 * Lightweight symmetric encryption for localStorage using the Web Crypto API.
 *
 * Keys are encrypted with AES-GCM using a per-origin key derived from a
 * device-specific "salt" stored in localStorage itself. This is NOT a
 * replacement for server-side secret storage, but it prevents the raw API key
 * from being readable as plain text in browser dev tools or storage inspector.
 *
 * Threat model: protects against casual inspection / XSS payload that dumps
 * localStorage but cannot call SubtleCrypto. Does NOT protect against a
 * full-scope XSS attacker who can call the same Web Crypto APIs in context.
 */

const SALT_KEY = '_cs_salt';
const ALGO = 'AES-GCM';
const KEY_LEN = 256;

function getOrCreateSalt(): string {
  let salt = localStorage.getItem(SALT_KEY);
  if (!salt) {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    salt = btoa(String.fromCharCode(...bytes));
    localStorage.setItem(SALT_KEY, salt);
  }
  return salt;
}

async function deriveKey(salt: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(salt + window.location.origin),
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations: 100_000, hash: 'SHA-256' },
    keyMaterial,
    { name: ALGO, length: KEY_LEN },
    false,
    ['encrypt', 'decrypt'],
  );
}

function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function fromBase64(str: string): ArrayBuffer {
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer as ArrayBuffer;
}

export async function encryptValue(plaintext: string): Promise<string> {
  const salt = getOrCreateSalt();
  const key = await deriveKey(salt);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt({ name: ALGO, iv }, key, enc.encode(plaintext));
  // Format: base64(iv):base64(ciphertext)
  return `${toBase64(iv.buffer as ArrayBuffer)}:${toBase64(ciphertext)}`;
}

export async function decryptValue(encrypted: string): Promise<string> {
  const parts = encrypted.split(':');
  if (parts.length !== 2) throw new Error('Invalid encrypted format');
  const salt = getOrCreateSalt();
  const key = await deriveKey(salt);
  const iv = fromBase64(parts[0]);
  const ciphertext = fromBase64(parts[1]);
  const dec = new TextDecoder();
  const plaintext = await crypto.subtle.decrypt({ name: ALGO, iv: new Uint8Array(iv) }, key, ciphertext);
  return dec.decode(plaintext);
}

/** Returns true if the value looks like an encrypted blob (iv:ciphertext). */
export function isEncrypted(value: string): boolean {
  const parts = value.split(':');
  return parts.length === 2 && parts[0].length > 0 && parts[1].length > 0;
}
