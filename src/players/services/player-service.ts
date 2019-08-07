import { provide } from 'inversify-binding-decorators';
import { Types } from 'mongoose';
import { Game, IGame } from '../../games/models';
import { IPlayer, Player } from '../models/player';

@provide(PlayerService)
export class PlayerService {

  public async getPlayerById(playerId: string): Promise<IPlayer> {
    if (!Types.ObjectId.isValid(playerId)) {
      throw new Error('invalid id');
    }

    return await Player.findById(playerId);
  }

  public async getPlayerGames(playerId: string): Promise<IGame[]> {
    if (!Types.ObjectId.isValid(playerId)) {
      throw new Error('invalid id');
    }

    return await Game.find({ players: playerId }).sort({ launchedAt: -1 });
  }

}
