import { generateKeyPairSync } from 'crypto';
import { buildProviderModule } from 'inversify-binding-decorators';
import { decode } from 'jsonwebtoken';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { connect } from 'mongoose';
import { container } from '../../container';
import { RefreshToken } from '../models/refresh-token';
import { KeyStore } from './key-store';
import { TokenService } from './token-service';

class KeyStoreStub {
  public authKey = generateKeyPairSync('ec', {
    namedCurve: 'secp521r1',
  });

  public refreshKey = generateKeyPairSync('ec', {
    namedCurve: 'secp521r1',
  });

  public getKey(name: string, purpose: string) {
    switch (name) {
      case 'auth': {
        switch (purpose) {
          case 'sign': return this.authKey.privateKey.export({ format: 'pem', type: 'pkcs8' });
          case 'verify': return this.authKey.publicKey.export({ format: 'pem', type: 'spki' });
          default: throw new Error('invalid purpose');
        }
      }

      case 'refresh': {
        switch (purpose) {
          case 'sign': return this.refreshKey.privateKey.export({ format: 'pem', type: 'pkcs8' });
          case 'verify': return this.refreshKey.publicKey.export({ format: 'pem', type: 'spki' });
          default: throw new Error('invalid purpose');
        }
      }

      case 'ws': {
        return 'secret';
      }
    }
  }
}

describe('TokenService', () => {
  const keyStore = new KeyStoreStub();
  let mongod: MongoMemoryServer;
  let service: TokenService;

  beforeAll(async () => {
    container.load(buildProviderModule());

    mongod = new MongoMemoryServer();
    const uri = await mongod.getConnectionString();
    await connect(uri, { useNewUrlParser: true });
  });

  afterAll(async () => await mongod.stop());

  beforeEach(() => {
    container.snapshot();
    container.rebind('config').toConstantValue({ });
    container.rebind(KeyStore).toConstantValue(keyStore as unknown as KeyStore);
    service = container.resolve<TokenService>(TokenService);
  });

  afterEach(() => container.restore());

  describe('#generateToken()', () => {
    describe('auth token', () => {
      it('retrieves the key from the key store', () => {
        const spy = spyOn(keyStore, 'getKey').and.callThrough();
        service.generateToken('auth', 'FAKE_ID');
        expect(spy).toHaveBeenCalledWith('auth', 'sign');
      });

      it('stores user id', () => {
        const token = service.generateToken('auth', 'FAKE_ID');
        const decoded = decode(token) as { id: string; iat: number; exp: number };
        expect(decoded.id).toEqual('FAKE_ID');
      });
    });

    describe('refresh token', () => {
      it('retrieves the key from the key store', () => {
        const spy = spyOn(keyStore, 'getKey').and.callThrough();
        service.generateToken('refresh', 'FAKE_ID');
        expect(spy).toHaveBeenCalledWith('refresh', 'sign');
      });

      it('stores user id', () => {
        const token = service.generateToken('refresh', 'FAKE_ID');
        const decoded = decode(token) as { id: string; iat: number; exp: number };
        expect(decoded.id).toEqual('FAKE_ID');
      });

      it('stores the token in the database', async () => {
        const token = service.generateToken('refresh', 'FAKE_ID');
        const result = await RefreshToken.findOne({ value: token });
        expect(result).toBeTruthy();
      });
    });

    describe('ws token', () => {
      it('retrieves the key from the key store', () => {
        const spy = spyOn(keyStore, 'getKey').and.callThrough();
        service.generateToken('ws', 'FAKE_ID');
        expect(spy).toHaveBeenCalledWith('ws', 'sign');
      });

      it('stores user id', () => {
        const token = service.generateToken('ws', 'FAKE_ID');
        const decoded = decode(token) as { id: string; iat: number; exp: number };
        expect(decoded.id).toEqual('FAKE_ID');
      });
    });
  });

  describe('#refreshAuthToken()', () => {
    let refreshToken: string;

    beforeEach(() => {
      refreshToken = service.generateToken('refresh', 'FAKE_ID');
    });

    it('retrieves the key from the store', async () => {
      const spy = spyOn(keyStore, 'getKey').and.callThrough();
      await service.refreshAuthToken(refreshToken);
      expect(spy).toHaveBeenCalledWith('refresh', 'verify');
    });

    it('returns a new pair of tokens', async () => {
      const tokens = await service.refreshAuthToken(refreshToken);
      expect(tokens.authToken).toEqual(jasmine.any(String));
      expect(tokens.refreshToken).toEqual(jasmine.any(String));
      expect(tokens.refreshToken).not.toEqual(refreshToken);
    });
  });
});
