import { sign } from 'jsonwebtoken';
import { config } from '../config';
import { keyStore } from './key-store';

/**
 * Generates a new JWT token for the given purpose.
 * 'refresh' tokens are issued for 7 days and are used to generate new auth tokens for the client.
 * 'auth' tokens are issued for 15 minutes are are used to authenticate every call.
 * 'ws' toknes are issued for 30 seconds and are used to authenticate to websockets.
 */
export function generateToken(purpose: 'refresh' | 'auth' | 'ws', userId: string): string {
  const secret = keyStore.secretFor(purpose);

  switch (purpose) {
    case 'refresh':
      return sign({ id: userId }, secret, { expiresIn: '7d' });

    case 'auth':
      return sign({ id: userId }, secret, { expiresIn: '15m' });

    case 'ws':
      return sign({ id: userId }, secret, { expiresIn: '30s' });
  }
}
