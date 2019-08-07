import { Request, Response } from 'express';
import { inject } from 'inversify';
import { controller, httpGet, httpPut, queryParam, request, response } from 'inversify-express-utils';
import { ensureAuthenticated } from '../../auth';
import { GameService } from '../../games';
import { ProfileService } from '../services';

@controller('/profile', ensureAuthenticated)
export class ProfileController {

  constructor(
    @inject(ProfileService) private profileService: ProfileService,
    @inject(GameService) private gameService: GameService,
  ) { }

  @httpGet('/')
  public async getProfile(@request() req: Request, @response() res: Response) {
    const activeGame = await this.gameService.activeGameForPlayer(req.user.id);
    return res.status(200).send({
      ...req.user,
      activeGameId: activeGame ? activeGame.id : null,
    });
  }

  @httpPut('/')
  public async acceptTerms(@queryParam() query: any, @request() req: Request, @response() res: Response) {
    if (query.hasOwnProperty('accept_terms')) {
      await this.profileService.acceptTerms(req.user.id);
    }

    return res.status(204).send();
  }

}
