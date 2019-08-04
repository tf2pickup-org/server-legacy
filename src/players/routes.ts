import { Router } from 'express';
import { Types } from 'mongoose';
import { ensureAuthenticated, ensureRole } from '../auth';
import { Game } from '../games/models/game';
import { initSkill } from './init-skill';
import { Player } from './models/player';
import { IPlayerSkill, PlayerSkill } from './models/player-skill';

const router = Router();

router
  .route('/:playerId')
  .get(async (req, res) => {
    const id = req.params.playerId;
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).send({ message: 'invalid id' });
    }

    const player = await Player.findById(id);
    if (player) {
      const gameCount = await Game.find({ players: id }).countDocuments();
      return res.status(200).send({
        ...player.toJSON(),
        gameCount,
      });
    } else {
      return res.status(404).send({ message: 'no such player' });
    }
  })
  .put(ensureAuthenticated, ensureRole('super-user', 'admin'), async (req, res) => {
    const id = req.params.playerId;
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).send({ message: 'invalid id' });
    }

    const editedPlayer = req.body;
    if (!editedPlayer) {
      return res.status(400).send({ message: 'invalid player' });
    }

    const player = await Player.findById(id);
    player.name = editedPlayer.name;
    await player.save();

    if (editedPlayer.skill) {
      // yeah, this probably shouldn't be here, but there is literally no reason to move it to another endpoint
      const skill = await PlayerSkill.findOne({ player: id });
      skill.skill = editedPlayer.skill;
      await skill.save();
    }

    return res.status(200).send(player.toJSON());
  });

router
  .route('/:playerId/games')
  .get(async (req, res) => {
    const id = req.params.playerId;
    if (Types.ObjectId.isValid(id)) {
      const games = await Game.find({ players: id }).sort({ launchedAt: -1 });
      return res.status(200).send(games.map(g => g.toJSON()));
    } else {
      return res.status(400).send({ message: 'invalid player id' });
    }
  });

router
  .route('/:playerId/skill')
  .get(ensureAuthenticated, ensureRole('super-user', 'admin'), async (req, res) => {
    const id = req.params.playerId;
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).send({ message: 'invalid player id' });
    }

    let skill = await PlayerSkill.findOne({ player: id });
    if (!skill) {
      const player = await Player.findById(id);
      if (!player) {
        return res.status(404).send({ message: 'player not found' });
      } else {
        skill = await initSkill(id);
        return res.status(200).send(skill.toJSON());
      }
    } else {
      return res.status(200).send(skill.toJSON());
    }
  })
  .put(ensureAuthenticated, ensureRole('super-user', 'admin'), async (req, res) => {
    const id = req.params.playerId;
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).send({ message: 'invalid player id' });
    }

    const editedSkill = req.body as IPlayerSkill;
    if (!editedSkill) {
      return res.status(400).send({ message: 'invalid player skill' });
    }

    const skill = await PlayerSkill.findById(editedSkill.id);
    skill.skill = editedSkill.skill;
    await skill.save();
    return res.status(200).send(skill.toJSON());
  });

export default router;
