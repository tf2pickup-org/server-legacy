import { inject } from 'inversify';
import { provide } from 'inversify-binding-decorators';
import { gameModel } from '../../games/models/game';
import { QueueConfigService } from '../../queue/services/queue-config-service';
import { PlayerStats } from '../models/player-stats';

@provide(PlayerStatsService)
export class PlayerStatsService {

  constructor(
    @inject(QueueConfigService) private queueConfigService: QueueConfigService,
  ) { }

  public async getPlayerStats(playerId: string): Promise<PlayerStats> {
    const allGames = await gameModel.find({ players: playerId, state: 'ended' });
    const gamesPlayed = allGames.length;
    const classesPlayed = this.queueConfigService.queueConfig.classes
      .map(cls => cls.name)
      .reduce((prev, gameClass) => {
        prev[gameClass] = allGames
          .filter(g => !!g.slots.find(s => s.playerId === playerId && s.gameClass === gameClass))
          .length;
        return prev;
      }, { });

    return { player: playerId, gamesPlayed, classesPlayed };
  }

}
