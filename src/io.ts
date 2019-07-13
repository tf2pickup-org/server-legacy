import { Server } from 'http';
import socketio from 'socket.io';
import { authenticate } from 'socketio-jwt-auth';
import logger from './logger';
import { Player } from './players/models/player';
import { handleQueueWsEvents } from './queue';

export function setupIo(server: Server): SocketIO.Server {
  const io = socketio(server);

  io.use(authenticate({
    secret: 'secret',
    succeedWithoutToken: true,
  }, async (payload: { id?: any }, done) => {
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

  io.on('connection', socket => {
    if (socket.request.user.logged_in) {
      const userName = socket.request.user.name;
      logger.debug(`WS connection (${userName})`);
    } else {
      logger.debug('WS connection (anonymous)');
    }
  });

  handleQueueWsEvents(io);

  return io;
}
