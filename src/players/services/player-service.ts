import { provide } from 'inversify-binding-decorators';
import { InstanceType } from 'typegoose';
import { Game, gameModel } from '../../games/models';

@provide(PlayerService)
export class PlayerService {

  public async getPlayerGames(playerId: string): Promise<Array<InstanceType<Game>>> {
    return await gameModel.find({ players: playerId }).sort({ launchedAt: -1 });
  }

}
