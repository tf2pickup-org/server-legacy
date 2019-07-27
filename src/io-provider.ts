import socketio from 'socket.io';
import { authenticate } from 'socketio-jwt-auth';
import { Inject, Singleton } from 'typescript-ioc';
import { keyStore } from './auth';
import { ExpressAppProvider } from './express-app-provider';
import logger from './logger';
import { Player } from './players/models/player';

@Singleton
export class IoProvider {

  public io: SocketIO.Server;

  constructor(
    @Inject private expressAppProvider: ExpressAppProvider,
  ) {
    this.io = socketio(this.expressAppProvider.server);
    this.initializeAuth();
    logger.debug('io ready');
  }

  private initializeAuth() {
    this.io.use(authenticate({
      secret: keyStore.secretFor('ws'),
      succeedWithoutToken: true,
    }, async (payload: { id?: any }, done) => {
      logger.debug(`verifying`);
      if (payload && payload.id) {
        try {
          const player = await Player.findOne({ _id: payload.id });
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

    this.io.on('connection', socket => {
      if (socket.request.user.logged_in) {
        const userName = socket.request.user.name;
        logger.debug(`WS connection (${userName})`);
      } else {
        logger.debug('WS connection (anonymous)');
      }
    });
  }

}
