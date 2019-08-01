import { Router } from 'express';
import { Types } from 'mongoose';
import { ensureAuthenticated, ensureRole } from '../auth';
import { container } from '../container';
import logger from '../logger';
import { GameController } from './game-controller';
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
  })
  .put(ensureAuthenticated, ensureRole('super-user', 'admin'), async (req, res) => {
    const id = req.params.gameId;
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).send({ message: 'invalid game id' });
    }

    if (req.query.hasOwnProperty('force_end')) {
      const gameController = container.get(GameController);
      const game = await gameController.interruptGame(id, 'ended by admin');
      logger.info(`game #${game.number} interrupted by ${req.user.name}`);
      return res.status(204).send();
    }
  });

export default router;
