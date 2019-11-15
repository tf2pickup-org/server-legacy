import { DocumentType } from '@typegoose/typegoose';
import { provide } from 'inversify-binding-decorators';
import { Game, gameModel } from '../../games/models';

@provide(PlayerService)
export class PlayerService {

  public async getPlayerGames(playerId: string): Promise<Array<DocumentType<Game>>> {
    return await gameModel.find({ players: playerId }).sort({ launchedAt: -1 });
  }

}
