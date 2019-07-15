import { Router } from 'express';
import { Types } from 'mongoose';
import { ensureAuthenticated, ensureRole } from '../auth';
import { Game } from '../games/models/game';
import { Player } from './models/player';

const router = Router();

router
  .route('/:playerId')
  .get(async (req, res) => {
    const id = req.params.playerId;
    if (Types.ObjectId.isValid(id)) {
      const player = await Player.findById(id);
      if (player) {
        const gameCount = await Game.find({ players: id }).countDocuments();
        return res.status(200).send(
          {
            ...player.toJSON(),
            gameCount,
          });
      } else {
        return res.status(404).send({ message: 'no such player' });
      }
    } else {
      res.status(400).send({ message: 'invalid id' });
    }
  })
  .put(ensureAuthenticated, ensureRole('super-user'), async (req, res) => {
    const id = req.params.playerId;
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).send({ message: 'invalid id' });
    }

    const editedPlayer = req.body;
    if (!editedPlayer) {
      return res.status(400).send({ message: 'invalid body' });
    }

    const player = await Player.findById(id);
    player.name = editedPlayer.name;
    await player.save();

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
      res.status(400).send({ message: 'invalid player id' });
    }
  });

export default router;
