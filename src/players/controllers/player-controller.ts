import { Response } from 'express';
import { inject } from 'inversify';
import { controller, httpGet, httpPatch, httpPost, httpPut, requestBody, requestParam,
  response } from 'inversify-express-utils';
import { ensureAuthenticated, ensureRole } from '../../auth';
import { Player, playerModel } from '../models/player';
import { PlayerBan, playerBanModel } from '../models/player-ban';
import { PlayerSkill, playerSkillModel } from '../models/player-skill';
import { PlayerBansService, PlayerService, PlayerSkillService } from '../services';

@controller('/players')
export class PlayerController {

  constructor(
    @inject(PlayerService) private playerService: PlayerService,
    @inject(PlayerSkillService) private playerSkillService: PlayerSkillService,
    @inject(PlayerBansService) private playerBansService: PlayerBansService,
  ) { }

  @httpGet('/')
  public async index(@response() res: Response) {
    const players = await playerModel.find();
    return res.status(200).send(players.map(p => p.toJSON()));
  }

  @httpGet('/:id')
  public async getPlayer(@requestParam('id') playerId: string, @response() res: Response) {
    try {
      const player = await playerModel.findById(playerId);
      if (player) {
        return res.status(200).send(player);
      } else {
        return res.status(404).send({ message: 'no such player' });
      }
    } catch (error) {
      return res.status(400).send({ message: error.message });
    }
  }

  @httpPatch('/:id', ensureAuthenticated, ensureRole('admin', 'super-user'))
  public async savePlayer(@requestParam('id') playerId: string, @requestBody() body: Partial<Player>,
                          @response() res: Response) {
    try {
      const player = await playerModel.findById(playerId);
      if (player) {
        player.name = body.name;
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
      return res.status(200).send(skill);
    } catch (error) {
      return res.status(400).send({ message: error.message });
    }
  }

  @httpPut('/:id/skill', ensureAuthenticated, ensureRole('admin', 'super-user'))
  public async setPlayerSkill(@requestParam('id') playerId: string, @requestBody() playerSkill: PlayerSkill,
                              @response() res: Response) {
    try {
      const skill = await playerSkillModel.findOne({ player: playerId });
      if (skill) {
        skill.skill = playerSkill.skill;
        await skill.save();
        return res.status(200).send(skill.toJSON());
      } else {
        return res.status(404).send({ message: 'no such player' });
      }
    } catch (error) {
      return res.status(400).send({ message: error.message });
    }
  }

  @httpGet('/:id/bans', ensureAuthenticated, ensureRole('admin', 'super-user'))
  public async getPlayerBans(@requestParam('id') playerId: string, @response() res: Response) {
    try {
      const bans = await playerBanModel.find({ player: playerId });
      return res.status(200).send(bans.map(b => b.toJSON()));
    } catch (error) {
      return res.status(400).send({ message: error.message });
    }
  }

  @httpPost('/:id/bans', ensureAuthenticated, ensureRole('admin', 'super-user'))
  public async addPlayerBan(@requestParam('id') playerId: string, @requestBody() ban: PlayerBan,
                            @response() res: Response) {
    try {
      const addedBan = await playerBanModel.create(ban);
      return res.status(201).send(addedBan.toJSON());
    } catch (error) {
      return res.status(400).send({ message: error.message });
    }
  }

}
