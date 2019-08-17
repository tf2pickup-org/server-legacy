import { Request, Response } from 'express';
import { inject } from 'inversify';
import { controller, httpGet, httpPatch, httpPost, httpPut, queryParam, request,
  requestBody, requestParam, response} from 'inversify-express-utils';
import { ensureAuthenticated, ensureRole } from '../../auth';
import { gameModel } from '../../games/models/game';
import { Player, playerModel } from '../models/player';
import { PlayerBan, playerBanModel } from '../models/player-ban';
import { PlayerSkill, playerSkillModel } from '../models/player-skill';
import { OnlinePlayerService, PlayerBansService, PlayerService, PlayerSkillService,
    PlayerStatsService } from '../services';

@controller('/players')
export class PlayerController {

  constructor(
    @inject(PlayerService) private playerService: PlayerService,
    @inject(PlayerSkillService) private playerSkillService: PlayerSkillService,
    @inject(PlayerStatsService) private playerStatsService: PlayerStatsService,
    @inject(PlayerBansService) private playerBansService: PlayerBansService,
    @inject(OnlinePlayerService) private onlinePlayersService: OnlinePlayerService,
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
        this.onlinePlayersService.getSocketsForPlayer(playerId).forEach(socket =>
          socket.emit('profile update', { name: player.name }));
        return res.status(200).send(player.toJSON());
      } else {
        return res.status(404).send({ message: 'no such player' });
      }
    } catch (error) {
      return res.status(400).send({ message: error.message });
    }
  }

  @httpGet('/:id/games')
  public async getPlayerGames(@requestParam('id') playerId: string, @queryParam('limit') limit: string,
                              @queryParam('offset') offset: string, @response() res: Response) {
    if (limit === undefined || offset === undefined) {
      return res.status(400).send({ message: 'both limit and offset properties must be specified' });
    }

    try {
      const [ results, itemCount ] = await Promise.all([
        gameModel.find({ players: playerId })
          .sort({ launchedAt: -1 })
          .limit(parseInt(limit, 10))
          .skip(parseInt(offset, 10)),
        gameModel.count({}),
      ]);

      return res.status(200).send({ results: results.map(r => r.toJSON()), itemCount });
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
      const bans = await playerBanModel.find({ player: playerId }).sort({ start: -1 });
      return res.status(200).send(bans.map(b => b.toJSON()));
    } catch (error) {
      return res.status(400).send({ message: error.message });
    }
  }

  @httpPost('/:id/bans', ensureAuthenticated, ensureRole('admin', 'super-user'))
  public async addPlayerBan(@requestParam('id') playerId: string, @requestBody() ban: PlayerBan,
                            @request() req: Request, @response() res: Response) {
    try {
      const admin = req.user.id;
      const addedBan = await this.playerBansService.addPlayerBan({ ...ban, admin });
      return res.status(201).send(addedBan.toJSON());
    } catch (error) {
      return res.status(400).send({ message: error.message });
    }
  }

  @httpPut('/:id/bans', ensureAuthenticated, ensureRole('admin', 'super-user'))
  public async alterPlayerBan(@requestParam('id') playerId: string, @queryParam() query: any,
                              @requestBody() ban: PlayerBan, @response() res: Response) {
    if (query.hasOwnProperty('revoke')) {
      try {
        const _ban = await this.playerBansService.revokeBan(ban.id.toString());
        return res.status(200).send(_ban.toJSON());
      } catch (error) {
        return res.status(400).send({ message: error.message });
      }
    }
  }

  @httpGet('/:id/stats')
  public async getPlayerStats(@requestParam('id') playerId: string, @response() res: Response) {
    try {
      const stats = await this.playerStatsService.getPlayerStats(playerId);
      return res.status(200).send(stats);
    } catch (error) {
      return res.status(500).send({ message: error.message });
    }
  }

}
