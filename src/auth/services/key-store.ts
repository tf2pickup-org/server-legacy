import { createPrivateKey, createPublicKey, generateKeyPairSync, KeyObject } from 'crypto';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { generate } from 'generate-password';
import { inject } from 'inversify';
import { provide } from 'inversify-binding-decorators';
import { Config } from '../../config';
import logger from '../../logger';

interface KeyPair {
  privateKey: KeyObject;
  publicKey: KeyObject;
}

type KeyName = 'auth' | 'refresh' | 'ws';

@provide(KeyStore)
export class KeyStore {

  private keys = new Map<KeyName, KeyPair>();
  private secrets = new Map<KeyName, string>();

  constructor(
    @inject('config') private config: Config,
  ) {
    this.initialize();
  }

  public getKey(name: 'auth' | 'refresh' | 'ws', purpose: 'sign' | 'verify'): string | Buffer {
    switch (name) {
      case 'auth':
      case 'refresh': {
        switch (purpose) {
          case 'sign': return this.keys.get(name).privateKey.export({ format: 'pem', type: 'pkcs8' });
          case 'verify': return this.keys.get(name).publicKey.export({ format: 'pem', type: 'spki' });
          default: throw new Error('invalid purpose');
        }
      }

      case 'ws': {
        return this.secrets.get('ws');
      }
    }
  }

  private initialize() {
    if (!existsSync(this.config.keyStoreFile)) {
      const authKeys = generateKeyPairSync('ec', {
        namedCurve: 'secp521r1',
      });

      this.keys.set('auth', authKeys);

      const refreshKeys = generateKeyPairSync('ec', {
        namedCurve: 'secp521r1',
      });
      this.keys.set('refresh', refreshKeys);

      const data = { };

      for (const key of this.keys.keys()) {
        const { privateKey, publicKey } = this.keys.get(key);
        data[key] = {
          privateKey: privateKey.export({
            format: 'pem',
            type: 'pkcs8',
            passphrase: this.config.keyStorePassphare,
            cipher: 'aes-256-cbc',
          }) as string,
          publicKey: publicKey.export({
            format: 'pem',
            type: 'spki',
          }) as string,
        };
      }

      writeFileSync(this.config.keyStoreFile, JSON.stringify(data), 'utf-8');
      logger.info('created new keys');
    } else {
      const data = JSON.parse(readFileSync(this.config.keyStoreFile, 'utf-8'));
      Object.keys(data).forEach(key => {
        const keyPair = data[key];
        const privateKey = createPrivateKey({
          key: keyPair.privateKey,
          format: 'pem',
          passphrase: this.config.keyStorePassphare,
        });

        const publicKey = createPublicKey({
          key: keyPair.publicKey,
          format: 'pem',
        });

        this.keys.set(key as KeyName, { privateKey, publicKey });
      });

      logger.info('keys imported successfully');
    }

    const wsSecret = generate({ length: 32, numbers: true, uppercase: true });
    this.secrets.set('ws', wsSecret);
  }

}
