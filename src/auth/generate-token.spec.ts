import { decode, verify } from 'jsonwebtoken';
import { generateToken } from './generate-token';
import { keyStore } from './key-store';

describe('generateToken', () => {
  it('should generate auth token', () => {
    const token = generateToken('auth', 'FAKE_ID');
    const decoded = decode(token) as { id: string; iat: number; exp: number };
    expect(decoded.id).toEqual('FAKE_ID');

    const secret = keyStore.secretFor('auth');
    expect(() => verify(token, secret)).not.toThrow();
  });

  it('should generate refresh token', () => {
    const token = generateToken('refresh', 'FAKE_ID');
    const decoded = decode(token) as { id: string; iat: number; exp: number };
    expect(decoded.id).toEqual('FAKE_ID');

    const secret = keyStore.secretFor('refresh');
    expect(() => verify(token, secret)).not.toThrow();
  });

  it('should generate ws token', () => {
    const token = generateToken('ws', 'FAKE_ID');
    const decoded = decode(token) as { id: string; iat: number; exp: number };
    expect(decoded.id).toEqual('FAKE_ID');

    const secret = keyStore.secretFor('ws');
    expect(() => verify(token, secret)).not.toThrow();
  });
});
