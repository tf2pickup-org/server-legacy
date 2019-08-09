import { provide } from 'inversify-binding-decorators';
import { PlayerBan, playerBanModel } from '../models/player-ban';

@provide(PlayerBansService)
export class PlayerBansService {

  public async getActiveBansForPlayer(playerId: string): Promise<PlayerBan[]> {
    return await playerBanModel.find({
      player: playerId,
      end: {
        $lte: new Date(),
      },
    });
  }

}
