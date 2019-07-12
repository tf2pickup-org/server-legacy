import { Router } from 'express';
import { queue } from './queue';

const router = Router();

router
  .route('/')
  .get((req, res) => res.status(200).send(queue));

export default router;
