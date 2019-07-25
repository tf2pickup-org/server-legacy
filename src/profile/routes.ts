import { Router } from 'express';
import { ensureAuthenticated } from '../auth';
import { gameController } from '../games';
import { Player } from '../players/models/player';

const router = Router();

router
  .route('/')
  .get(ensureAuthenticated, async (req, res) => {
    const activeGame = await gameController.activeGameForPlayer(req.user.id);
    res.status(200).send({
      ...req.user.toJSON(),
      activeGameId: activeGame ? activeGame.id : null,
    });
  })
  .put(ensureAuthenticated, async (req, res) => {
    if (req.query.hasOwnProperty('accept_terms')) {
      const player = await Player.findById(req.user.id);
      player.hasAcceptedRules = true;
      await player.save();
    }

    return res.status(204).send();
  });

export default router;
