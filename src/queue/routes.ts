import { Router } from 'express';
import { queue } from './queue';

const router = Router();

router
  .route('/')
  .get((req, res) => res.status(200).send({
    config: queue.config,
    state: queue.state,
    slots: queue.slots,
    map: queue.map,
  }));

router
  .route('/slots')
  .get((req, res) => res.status(200).send(queue.slots));

router
  .route('/state')
  .get((req, res) => res.status(200).send(queue.state));

export default router;
