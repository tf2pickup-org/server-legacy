import { leaveQueue } from './queue';

export function handleWsEvents(io: SocketIO.Server) {
  io.on('connection', socket => {
    if (socket.request.user.logged_in) {
      socket.on('disconnect', () => {
        const user = socket.request.user;
        leaveQueue(user.id);
      });
    }
  });
}
