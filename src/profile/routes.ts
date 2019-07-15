import { Router } from 'express';
import { ensureAuthenticated } from '../auth';
import { gameController } from '../games';

const router = Router();

router
  .route('/')
  .get(ensureAuthenticated, async (req, res) => {
    const activeGame = await gameController.activeGameForPlayer(req.user.id);
    res.status(200).send({
      ...req.user.toJSON(),
      activeGameId: activeGame ? activeGame.id : null,
    });
  });

export default router;
