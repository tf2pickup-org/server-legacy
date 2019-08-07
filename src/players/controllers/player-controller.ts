import { Response } from 'express';
import { inject } from 'inversify';
import { controller, httpGet, httpPatch, requestBody, requestParam, response } from 'inversify-express-utils';
import { ensureAuthenticated, ensureRole } from '../../auth';
import { Player } from '../models/player';
import { PlayerService, PlayerSkillService } from '../services';

@controller('/players')
export class PlayerController {

  constructor(
    @inject(PlayerService) private playerService: PlayerService,
    @inject(PlayerSkillService) private playerSkillService: PlayerSkillService,
  ) { }

  @httpGet('/')
  public async index(@response() res: Response) {
    const players = await Player.find();
    return res.status(200).send(players.map(p => p.toJSON()));
  }

  @httpGet('/:id')
  public async getPlayer(@requestParam('id') playerId: string, @response() res: Response) {
    try {
      const player = await this.playerService.getPlayerById(playerId);
      if (player) {
        return res.status(200).send(player.toJSON());
      } else {
        return res.status(404).send({ message: 'no such player' });
      }
    } catch (error) {
      return res.status(400).send({ message: error.message });
    }
  }

  @httpPatch('/:id', ensureAuthenticated, ensureRole('admin', 'super-user'))
  public async savePlayer(@requestParam('id') playerId: string, @requestBody() body: any,
                          @response() res: Response) {
    try {
      const player = await this.playerService.getPlayerById(playerId);
      if (player) {
        Object.keys(body).forEach(key => player[key] = body[key]);
        await player.save();
        return res.status(200).send(player.toJSON());
      } else {
        return res.status(404).send({ message: 'no such player' });
      }
    } catch (error) {
      return res.status(400).send({ message: error.message });
    }
  }

  @httpGet('/:id/games')
  public async getPlayerGames(@requestParam('id') playerId: string, @response() res: Response) {
    try {
      const games = await this.playerService.getPlayerGames(playerId);
      return res.status(200).send(games.map(g => g.toJSON()));
    } catch (error) {
      return res.status(400).send({ message: error.message });
    }
  }

  @httpGet('/:id/skill', ensureAuthenticated, ensureRole('admin', 'super-user'))
  public async getPlayerSkill(@requestParam('id') playerId: string, @response() res: Response) {
    try {
      const skill = await this.playerSkillService.getPlayerSkill(playerId);
      return res.status(200).send(skill.toJSON());
    } catch (error) {
      return res.status(400).send({ message: error.message });
    }
  }

}
