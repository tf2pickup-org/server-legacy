import { Router } from 'express';
import { Types } from 'mongoose';
import { Game } from './models/game';

const router = Router();

router
  .route('/')
  .get(async (req, res) => {
    const games = await Game.find().sort({ launchedAt: -1 });
    return res.status(200).send(games.map(g => g.toJSON()));
  });

router
  .route('/:gameId')
  .get(async (req, res) => {
    const id = req.params.gameId;
    if (Types.ObjectId.isValid(id)) {
      const game = await Game.findById(id);
      if (game) {
        return res.status(200).send(game.toJSON());
      } else {
        return res.status(404).send({ message: 'no such game' });
      }
    } else {
      res.status(400).send({ message: 'invalid id' });
    }
  });

export default router;
