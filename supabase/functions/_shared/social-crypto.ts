import { isRecord } from './media-helpers.ts';
import type { SocialToken } from './social-types.ts';

function base64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}
function bytes(value: string): Uint8Array {
  return Uint8Array.from(atob(value.replaceAll('-', '+').replaceAll('_', '/')), character => character.charCodeAt(0));
}
async function key(value: string): Promise<CryptoKey> {
  const raw = bytes(value);
  if (raw.length !== 32) throw new Error('Social token encryption is not configured.');
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
}
export function randomState(): string {
  return base64(crypto.getRandomValues(new Uint8Array(32)));
}
export async function stateDigest(value: string): Promise<string> {
  return base64(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))));
}
export async function sealToken(token: SocialToken, encryptionKey: string, ownerId: string, platform: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(`${ownerId}:${platform}`) }, await key(encryptionKey), new TextEncoder().encode(JSON.stringify(token)));
  return `v1.${base64(iv)}.${base64(new Uint8Array(encrypted))}`;
}
export async function openToken(payload: string, encryptionKey: string, ownerId: string, platform: string): Promise<SocialToken> {
  const [version, iv, ciphertext] = payload.split('.');
  if (version !== 'v1' || !iv || !ciphertext) throw new Error('Reconnect this account.');
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes(iv), additionalData: new TextEncoder().encode(`${ownerId}:${platform}`) }, await key(encryptionKey), bytes(ciphertext));
  const token: unknown = JSON.parse(new TextDecoder().decode(decrypted));
  if (!isRecord(token) || typeof token.accessToken !== 'string' || typeof token.refreshToken !== 'string' || typeof token.expiresAt !== 'string' || typeof token.externalId !== 'string' || !Array.isArray(token.scopes) || !token.scopes.every(scope => typeof scope === 'string') || !(token.refreshExpiresAt === null || typeof token.refreshExpiresAt === 'string')) throw new Error('Reconnect this account.');
  return token as SocialToken;
}
