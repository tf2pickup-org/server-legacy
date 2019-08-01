import { Router } from 'express';
import { container } from '../container';
import { Queue } from './queue';

const router = Router();

router
  .route('/')
  .get((req, res) => {
    const queue = container.get(Queue);
    return res.status(200).send({
      config: queue.config,
      state: queue.state,
      slots: queue.slots,
      map: queue.map,
    });
  });

router
  .route('/slots')
  .get((req, res) => res.status(200).send(container.get(Queue).slots));

router
  .route('/state')
  .get((req, res) => res.status(200).send(container.get(Queue).state));

export default router;
