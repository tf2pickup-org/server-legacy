import { Router } from 'express';
import { ensureAuthenticated } from '../auth';
import { joinQueue, leaveQueue, queueConfig, queueSlots } from './queue';

const router = Router();

router
  .route('/')
  .get((req, res) => res.status(200).send({
    config: queueConfig,
    slots: queueSlots,
  }));

router
  .route('/slots')
  .get((req, res) => res.status(200).send(queueSlots))
  .post(ensureAuthenticated, (req, res) => {
    const playerId = req.user.id;
    const slotId = req.body.slot_id;

    try {
      joinQueue(slotId, playerId);
      return res.status(200).send(queueSlots);
    } catch (error) {
      return res.status(400).send({ message: error.message });
    }
  })
  .delete(ensureAuthenticated, (req, res) => {
    const playerId = req.user.id;
    leaveQueue(playerId);
    return res.status(200).send(queueSlots);
  });

export default router;
