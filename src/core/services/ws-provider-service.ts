import { inject } from 'inversify';
import { provide } from 'inversify-binding-decorators';
import socketio from 'socket.io';
import { authenticate } from 'socketio-jwt-auth';
import { KeyStore } from '../../auth/services/key-store';
import logger from '../../logger';
import { playerModel } from '../../players/models/player';
import { ExpressAppProvider } from './express-app-provider';

@provide(WsProviderService)
export class WsProviderService {

  public ws: SocketIO.Server;

  constructor(
    @inject(ExpressAppProvider) private expressAppProvider: ExpressAppProvider,
    @inject(KeyStore) private keyStore: KeyStore,
  ) {
    this.ws = socketio(this.expressAppProvider.server);
    this.initializeAuth();
    logger.debug('io ready');
  }

  private initializeAuth() {
    this.ws.use(authenticate({
      secret: this.keyStore.getKey('ws', 'verify') as string,
      succeedWithoutToken: true,
    }, async (payload: { id?: any }, done) => {
      if (payload && payload.id) {
        try {
          const player = await playerModel.findById(payload.id);
          if (player) {
            return done(null, player);
          } else {
            return done(null, false);
          }
        } catch (error) {
          return done(error, false);
        }
      } else {
        return done();
      }
    }));
  }

}
