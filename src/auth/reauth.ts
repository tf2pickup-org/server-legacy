import { decode, verify } from 'jsonwebtoken';
import { generateToken } from './generate-token';
import { keyStore } from './key-store';

/**
 * Generate new refresh token, auth token and invalidate the old refresh token.
 */
export function reauth(oldRefreshToken: string): { refreshToken: string, authToken: string } {
  verify(oldRefreshToken, keyStore.secretFor('refresh'));
  const decoded = decode(oldRefreshToken) as { id: string; iat: number; exp: number };
  const userId = decoded.id;
  const newRefreshToken = generateToken('refresh', userId);
  const authToken = generateToken('auth', userId);
  return { refreshToken: newRefreshToken, authToken };
}
