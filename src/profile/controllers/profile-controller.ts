import { Request, Response } from 'express';
import { inject } from 'inversify';
import { controller, httpGet, httpPut, queryParam, request, response } from 'inversify-express-utils';
import { ensureAuthenticated } from '../../auth';
import { GameService } from '../../games';
import { PlayerBansService } from '../../players/services/player-bans-service';
import { MapVoteService } from '../../queue/services/map-vote-service';
import { ProfileService } from '../services';

@controller('/profile', ensureAuthenticated)
export class ProfileController {

  constructor(
    @inject(ProfileService) private profileService: ProfileService,
    @inject(GameService) private gameService: GameService,
    @inject(PlayerBansService) private playerBansService: PlayerBansService,
    @inject(MapVoteService) private mapVoteService: MapVoteService,
  ) { }

  @httpGet('/')
  public async getProfile(@request() req: Request, @response() res: Response) {
    const user = req.user as { id: string, toJSON: () => any };
    const activeGame = await this.gameService.activeGameForPlayer(user.id);
    const bans = await this.playerBansService.getActiveBansForPlayer(user.id);
    const mapVote = this.mapVoteService.playerVote(user.id);
    return res.status(200).send({
      ...user.toJSON(),
      activeGameId: activeGame ? activeGame.id : null,
      bans,
      mapVote,
    });
  }

  @httpPut('/')
  public async acceptTerms(@queryParam() query: any, @request() req: Request, @response() res: Response) {
    if (query.hasOwnProperty('accept_terms')) {
      const user = req.user as { id: string };
      await this.profileService.acceptTerms(user.id);
    }

    return res.status(204).send();
  }

}
