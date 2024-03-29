import { DocumentType } from '@typegoose/typegoose';
import { EventEmitter } from 'events';
import { inject } from 'inversify';
import { provide } from 'inversify-binding-decorators';
import { WsProviderService } from '../../core/services/ws-provider-service';
import { Player } from '../models/player';

type SocketList = SocketIO.Socket[];

@provide(OnlinePlayerService)
export class OnlinePlayerService extends EventEmitter {

  private readonly verifyPlayerTimeout = 10 * 1000; // 10 seconds
  private sockets = new Map<string, SocketList>();

  constructor(
    @inject(WsProviderService) private wsProvider: WsProviderService,
  ) {
    super();

    this.wsProvider.ws.on('connection', socket => {
      if (socket.request.user.logged_in) {
        const player = socket.request.user as DocumentType<Player>;
        const sockets = this.sockets.get(player.id) || [];
        this.sockets.set(player.id, [ ...sockets, socket ]);

        socket.on('disconnect', () => {
          const sockets2 = this.sockets.get(player.id) || [];
          this.sockets.set(player.id, sockets2.filter(s => s !== socket));
          setTimeout(() => this.verifyPlayer(player.id), this.verifyPlayerTimeout);
        });
      }
    });
  }

  public getSocketsForPlayer(playerId: string): SocketIO.Socket[] {
    return this.sockets.get(playerId) || [];
  }

  private verifyPlayer(playerId: string) {
    const sockets = this.sockets.get(playerId);
    if (sockets.length === 0) {
      this.emit('player left', { playerId });
    }
  }

}
