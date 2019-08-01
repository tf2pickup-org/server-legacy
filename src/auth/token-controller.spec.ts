import { decode } from 'jsonwebtoken';
import { container } from '../container';
import { KeyStore } from './key-store';
import { TokenController } from './token-controller';

describe('TokenController', () => {
  let tokenController: TokenController;

  beforeEach(() => {
    container.rebind('config').toConstantValue({ });
  });

  beforeEach(() => {
    tokenController = container.resolve<TokenController>(TokenController);
  });

  describe('#generateToken()', () => {
    describe('retrieves the key from the key store', () => {
      it('for auth token', () => {
        const keyStore = container.get(KeyStore);
        const spy = spyOn(keyStore, 'getKey').and.callThrough();
        tokenController.generateToken('auth', 'FAKE_ID');
        expect(spy).toHaveBeenCalledWith('auth', 'sign');
      });

      it('for refresh token', () => {
        const keyStore = container.get(KeyStore);
        const spy = spyOn(keyStore, 'getKey').and.callThrough();
        tokenController.generateToken('refresh', 'FAKE_ID');
        expect(spy).toHaveBeenCalledWith('refresh', 'sign');
      });

      it('for ws token', () => {
        const keyStore = container.get(KeyStore);
        const spy = spyOn(keyStore, 'getKey').and.callThrough();
        tokenController.generateToken('ws', 'FAKE_ID');
        expect(spy).toHaveBeenCalledWith('ws', 'sign');
      });
    });

    it('generates auth token', () => {
      const token = tokenController.generateToken('auth', 'FAKE_ID');
      const decoded = decode(token) as { id: string; iat: number; exp: number };
      expect(decoded.id).toEqual('FAKE_ID');
    });

    it('generates refresh token', () => {
      const token = tokenController.generateToken('refresh', 'FAKE_ID');
      const decoded = decode(token) as { id: string; iat: number; exp: number };
      expect(decoded.id).toEqual('FAKE_ID');
    });

    it('generates ws token', () => {
      const token = tokenController.generateToken('ws', 'FAKE_ID');
      const decoded = decode(token) as { id: string; iat: number; exp: number };
      expect(decoded.id).toEqual('FAKE_ID');
    });
  });

  describe('#refreshAuthToken()', () => {
    let refreshToken: string;

    beforeEach(() => {
      refreshToken = tokenController.generateToken('refresh', 'FAKE_ID');
    });

    it('retrieves the key from the store', async () => {
      const keyStore = container.get(KeyStore);
      const spy = spyOn(keyStore, 'getKey').and.callThrough();
      await tokenController.refreshAuthToken(refreshToken);
      expect(spy).toHaveBeenCalledWith('refresh', 'verify');
    });

    it('returns a new pair of tokens', async () => {
      const tokens = await tokenController.refreshAuthToken(refreshToken);
      expect(tokens.authToken).toEqual(jasmine.any(String));
      expect(tokens.refreshToken).toEqual(jasmine.any(String));
      expect(tokens.refreshToken).not.toEqual(refreshToken);
    });
  });
});
