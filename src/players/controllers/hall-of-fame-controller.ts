import { inject } from 'inversify';
import { BaseHttpController, controller, httpGet } from 'inversify-express-utils';
import { HallOfFameService } from '../services/hall-of-fame-service';

@controller('/hall-of-fame')
export class HallOfFameController extends BaseHttpController {

  constructor(
    @inject(HallOfFameService) private hallOfFameService: HallOfFameService,
  ) {
    super();
  }

  @httpGet('/')
  public async index() {
    const mostActivePlayers = await this.hallOfFameService.getMostActivePlayers();
    const mostActiveMedics = await this.hallOfFameService.getMostActiveMedics();
    return this.json({ mostActivePlayers, mostActiveMedics });
  }

}
