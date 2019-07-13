import { Router } from 'express';
import { ensureAuthenticated } from '../auth';
import { queue } from './queue';

const router = Router();

router
  .route('/')
  .get((req, res) => res.status(200).send({
    config: queue.config,
    state: queue.state,
    slots: queue.slots,
  }));

router
  .route('/slots')
  .get((req, res) => res.status(200).send(queue.slots))
  .put(ensureAuthenticated, (req, res) => {
    const playerId = req.user.id;
    const action = req.body.action;

    switch (action) {
      case 'join': {
        const slotId = req.body.slot_id;
        try {
          queue.join(slotId, playerId);
          return res.status(200).send(queue.slots);
        } catch (error) {
          return res.status(400).send({ message: error.message });
        }
      }

      case 'leave': {
        queue.leave(playerId);
        return res.status(200).send(queue.slots);
      }
    }
  });

router
  .route('/state')
  .get((req, res) => res.status(200).send(queue.state));

export default router;
