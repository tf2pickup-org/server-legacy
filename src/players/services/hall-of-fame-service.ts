import { provide } from 'inversify-binding-decorators';
import { gameModel } from '../../games/models/game';

@provide(HallOfFameService)
export class HallOfFameService {

  private readonly standardAggregateOptions = [
    { $sort: { count: -1 } },
    { $limit: 10 },
    { $project: { player: '$_id', count: 1, _id: 0 } },
  ];

  public async getMostActivePlayers() {
    return gameModel
      .aggregate([
        { $match: { state: 'ended' } },
        { $unwind: '$players' },
        { $group: { _id: '$players', count: { $sum: 1 } } },
        ...this.standardAggregateOptions,
      ]);
  }

  public async getMostActiveMedics() {
    return gameModel
      .aggregate([
        { $match: { state: 'ended' } },
        { $unwind: '$slots' },
        { $match: { 'slots.gameClass': 'medic' } },
        { $group: { _id: '$slots.playerId', count: { $sum: 1 } } },
        ...this.standardAggregateOptions,
      ]);
  }

}
