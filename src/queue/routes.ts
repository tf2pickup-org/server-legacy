import { Router } from 'express';
import { ensureAuthenticated } from '../auth';
import { joinQueue, leaveQueue, queue } from './queue';

const router = Router();

router
  .route('/')
  .get((req, res) => res.status(200).send(queue));

router
  .route('/players')
  .get((req, res) => res.status(200).send(queue.players))
  .post(ensureAuthenticated, (req, res) => {
    const playerId = req.user.id;
    const slot = req.body.slot;

    try {
      joinQueue(slot, playerId);
      return res.status(200).send(queue.players);
    } catch (error) {
      return res.status(400).send({ message: error.message });
    }
  })
  .delete(ensureAuthenticated, (req, res) => {
    const playerId = req.user.id;
    leaveQueue(playerId);
    return res.status(200).send(queue.players);
  });

export default router;
