import { inject } from 'inversify';
import { provide } from 'inversify-binding-decorators';
import socketio from 'socket.io';
import { authenticate } from 'socketio-jwt-auth';
import { KeyStore } from '../../auth';
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
      logger.debug(`verifying`);
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

    this.ws.on('connection', socket => {
      if (socket.request.user.logged_in) {
        const userName = socket.request.user.name;
        logger.debug(`WS connection (${userName})`);
      } else {
        logger.debug('WS connection (anonymous)');
      }
    });
  }

}
