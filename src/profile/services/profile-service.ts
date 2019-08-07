import { provide } from 'inversify-binding-decorators';
import { Player } from '../../players/models/player';

@provide(ProfileService)
export class ProfileService {

  public async acceptTerms(playerId: string) {
    const player = await Player.findById(playerId);
    player.hasAcceptedRules = true;
    await player.save();
  }

}
