import { inject, injectable } from 'inversify';
import { sign, SignOptions, verify } from 'jsonwebtoken';
import { container } from '../container';
import { KeyStore } from './key-store';
import { RefreshToken } from './models/refresh-token';

@injectable()
export class TokenController {

  private readonly commonTokenOptions: SignOptions = { algorithm: 'ES512' };
  private readonly authTokenOptions: SignOptions = { ...this.commonTokenOptions, expiresIn: '15m' };
  private readonly refreshTokenOptions: SignOptions = { ...this.commonTokenOptions, expiresIn: '7d' };
  private readonly wsTokenOptions: SignOptions = { algorithm: 'HS256', expiresIn: '1h' };

  constructor(
    @inject(KeyStore) private keyStore: KeyStore,
  ) { }

  public generateToken(purpose: 'auth' | 'refresh' | 'ws', userId: string): string {
    switch (purpose) {
      case 'auth': {
        const key = this.keyStore.getKey('auth', 'sign');
        return sign({ id: userId }, key, this.authTokenOptions);
      }

      case 'refresh': {
        const key = this.keyStore.getKey('refresh', 'sign');
        const token = sign({ id: userId }, key, this.refreshTokenOptions);
        new RefreshToken({ value: token }).save();
        return token;
      }

      case 'ws': {
        const key = this.keyStore.getKey('ws', 'sign');
        return sign({ id: userId }, key, this.wsTokenOptions);
      }

      default:
        throw new Error('unknown purpose');
    }
  }

  public async refreshAuthToken(oldRefreshToken: string): Promise<{ refreshToken: string, authToken: string }> {
    const key = this.keyStore.getKey('refresh', 'verify');

    const result = await RefreshToken.findOne({ value: oldRefreshToken });
    if (!result) {
      throw new Error('token invalid');
    }

    const decoded = verify(oldRefreshToken, key, this.commonTokenOptions) as { id: string; iat: number; exp: number };
    await result.remove();

    const userId = decoded.id;
    const refreshToken = this.generateToken('refresh', userId);
    const authToken = this.generateToken('auth', userId);
    return { refreshToken, authToken };
  }

}

container.bind(TokenController).toSelf();
