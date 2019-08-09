import { provide } from 'inversify-binding-decorators';
import { playerModel } from '../../players/models/player';

@provide(ProfileService)
export class ProfileService {

  public async acceptTerms(playerId: string) {
    const player = await playerModel.findById(playerId);
    if (!player) {
      throw new Error('no such player');
    }

    player.hasAcceptedRules = true;
    await player.save();
  }

}
